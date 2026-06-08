# Supabase SQL / RLS Design

## 目的

Life Cards を single user private sync として PC / スマホ間で同期するための、Supabase SQL schema と RLS policy の初期案を残す。

この document はレビュー用の設計案であり、まだ実DBには適用しない。

今回の前提:

- 個人利用。
- PC / スマホ同期。
- 公開共有なし。
- 共同編集なし。
- 3人運用なし。
- Supabase SDK 導入なし。

レビュー結論:

- 分類: 要確認。
- private sync の初期案として主キー、RLS、Encounter 分離の方向は妥当。
- 実適用前に、削除方針、Storage policy helper、migration 順序、adapter の置き場所を確定する。

## 1. 主キー方針

`decks.id` や `cards.id` は現行 localStorage の id と互換を取るため `text` を維持する。

ただし、`decks.id = 'uncategorized'` のような固定 id は user 間で必ず衝突する。`cards.id = card_${Date.now()}` も理論上 user 間で衝突し得る。

そのため、初期 SQL 案では以下を推奨する。

- `decks`: `primary key (user_id, id)`
- `cards`: `primary key (user_id, id)`
- `encounters`: `primary key (user_id, card_id)`

この方針なら、app 内の `Card.id` / `Deck.id` はそのまま維持しつつ、Supabase 上では user ごとに名前空間を分けられる。

## 2. Tables

対象 table:

- `profiles`
- `decks`
- `cards`
- `encounters`

`auth.users` を認証の正とし、app 用の補助情報が必要な場合のみ `profiles` を使う。

## 3. Create Table SQL 案

### profiles

```sql
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

### decks

```sql
create table if not exists public.decks (
  id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  sort_order integer not null default 0,
  is_shared boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);
```

補足:

- `id = 'uncategorized'` を user ごとに持てる。
- `is_shared` は現行型との整合のため残すが、今回の RLS では共有用途に使わない。
- `cardCount` は保存せず、cards から集計する。

### cards

```sql
create table if not exists public.cards (
  id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  deck_id text not null,
  front_text text,
  front_comment text,
  back_text text,
  image_path text,
  image_fit_mode text,
  is_favorite boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  primary key (user_id, id),
  foreign key (user_id, deck_id) references public.decks(user_id, id)
);
```

補足:

- `deck_id` は現行 `Card.deckId` と対応する。
- `image_path` は Storage path または adapter が解決できる画像参照を保存する。
- 画像本体は Database に入れない。
- `deleted_at` は将来拡張として残すが、初期実装では使わない。
- 初期削除方針はまず物理削除を推奨する。物理削除なら `encounters` の cascade cleanup と整合しやすい。

### encounters

```sql
create table if not exists public.encounters (
  user_id uuid not null references auth.users(id) on delete cascade,
  card_id text not null,
  first_viewed_at timestamptz,
  last_viewed_at timestamptz,
  view_count integer not null default 0,
  last_reencounter_at timestamptz,
  next_reencounter_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, card_id),
  foreign key (user_id, card_id) references public.cards(user_id, id) on delete cascade
);
```

補足:

- Card 本体に `last_viewed_at` / `view_count` を混ぜない。
- Reencounter Engine に渡す時は `Record<cardId, EncounterMetadata>` に adapter で変換する。
- card 物理削除時は encounter も cascade で消える。
- 初期削除方針は cards の物理削除を推奨するため、encounter は cascade で削除する。
- soft delete を将来採用する場合、encounter を残すか cleanup するかは別途決める。

## 4. Indexes

```sql
create index if not exists decks_user_sort_order_idx
  on public.decks (user_id, sort_order);

create index if not exists cards_user_deck_idx
  on public.cards (user_id, deck_id);

create index if not exists cards_user_updated_at_idx
  on public.cards (user_id, updated_at desc);

create index if not exists encounters_user_next_reencounter_at_idx
  on public.encounters (user_id, next_reencounter_at);
```

補足:

- `encounters_user_card_idx` は `primary key (user_id, card_id)` と重複するため、実適用時は不要候補とする。
- `cards_user_updated_at_idx` は同期時の差分取得や新しい順表示に使える。

soft delete を将来採用する場合の参考 index:

```sql
create index if not exists cards_user_deck_active_idx
  on public.cards (user_id, deck_id)
  where deleted_at is null;
```

## 5. RLS 有効化

```sql
alter table public.profiles enable row level security;
alter table public.decks enable row level security;
alter table public.cards enable row level security;
alter table public.encounters enable row level security;
```

## 6. Profiles RLS

```sql
create policy "profiles_select_own"
  on public.profiles
  for select
  using (id = auth.uid());

create policy "profiles_insert_own"
  on public.profiles
  for insert
  with check (id = auth.uid());

create policy "profiles_update_own"
  on public.profiles
  for update
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "profiles_delete_own"
  on public.profiles
  for delete
  using (id = auth.uid());
```

## 7. Decks RLS

```sql
create policy "decks_select_own"
  on public.decks
  for select
  using (user_id = auth.uid());

create policy "decks_insert_own"
  on public.decks
  for insert
  with check (user_id = auth.uid());

create policy "decks_update_own"
  on public.decks
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "decks_delete_own"
  on public.decks
  for delete
  using (user_id = auth.uid());
```

## 8. Cards RLS

```sql
create policy "cards_select_own"
  on public.cards
  for select
  using (user_id = auth.uid());

create policy "cards_insert_own"
  on public.cards
  for insert
  with check (user_id = auth.uid());

create policy "cards_update_own"
  on public.cards
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "cards_delete_own"
  on public.cards
  for delete
  using (user_id = auth.uid());
```

補足:

- 初期実装では card 削除はまず物理削除を推奨する。
- `deleted_at` は将来 soft delete に移る余地として残す。
- soft delete を採用する場合、app からは `delete` ではなく `deleted_at` update を使う案もある。
- その場合でも、private sync 初期案として delete policy は残してよい。

## 9. Encounters RLS

```sql
create policy "encounters_select_own"
  on public.encounters
  for select
  using (user_id = auth.uid());

create policy "encounters_insert_own"
  on public.encounters
  for insert
  with check (user_id = auth.uid());

create policy "encounters_update_own"
  on public.encounters
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "encounters_delete_own"
  on public.encounters
  for delete
  using (user_id = auth.uid());
```

## 10. Storage Policy 案

候補 bucket:

```txt
card-images
```

path 案:

```txt
users/{userId}/cards/{cardId}/front.webp
```

方針:

- public bucket にはしない。
- 画像は Supabase Storage に保存し、Database には `cards.image_path` として path だけ保存する。
- 操作可能な object は `users/{auth.uid()}/...` 配下に限定する。

Supabase Storage policy SQL は Storage の仕様と helper 関数を確認してから確定する。

特に、実適用前に Supabase の推奨 helper または `storage.foldername(name)` を確認すること。`split_part` 案は path 構造が固定されている場合の初期メモであり、公式推奨と異なる場合は公式 helper に寄せる。

初期案のイメージ:

```sql
-- Review before applying. Storage policy syntax depends on Supabase Storage details.
create policy "card_images_select_own"
  on storage.objects
  for select
  using (
    bucket_id = 'card-images'
    and split_part(name, '/', 2) = auth.uid()::text
  );

create policy "card_images_insert_own"
  on storage.objects
  for insert
  with check (
    bucket_id = 'card-images'
    and split_part(name, '/', 2) = auth.uid()::text
  );

create policy "card_images_update_own"
  on storage.objects
  for update
  using (
    bucket_id = 'card-images'
    and split_part(name, '/', 2) = auth.uid()::text
  )
  with check (
    bucket_id = 'card-images'
    and split_part(name, '/', 2) = auth.uid()::text
  );

create policy "card_images_delete_own"
  on storage.objects
  for delete
  using (
    bucket_id = 'card-images'
    and split_part(name, '/', 2) = auth.uid()::text
  );
```

注意:

- `name = users/{userId}/cards/{cardId}/front.webp` の場合、`split_part(name, '/', 2)` が userId になる想定。
- Supabase Storage の公式推奨 helper または `storage.foldername(name)` が使える場合は、実適用前にそちらへ寄せる。
- `split_part` 案を使う場合は、path の第2要素が必ず userId であることを upload 側でも保証する。
- signed URL を永続保存しない。永続値は Storage path にする。

## 11. localStorage Migration との接続

現在の localStorage:

```txt
life_cards.cards
life_cards.decks
life_cards.encounters
```

移行方針:

1. 初回ログイン後、localStorage の decks / cards / encounters を読む。
2. `uncategorized` deck を user ごとに必ず upsert する。
3. `decks` を `(user_id, id)` で upsert する。
4. `cards` を `(user_id, id)` で upsert する。
5. `encounters` を `(user_id, card_id)` で upsert する。
6. Supabase rows を現行 app 型へ adapter で戻す。

重要:

- migration は必ず `decks` -> `cards` -> `encounters` の順に行う。
- `cards` は `(user_id, deck_id)` で `decks` を参照するため、deck が先に存在している必要がある。
- `uncategorized` deck はログイン後または migration 前に必ず upsert する。削除済み deck から移動されたカードが参照できなくなるのを防ぐため。

注意:

- localStorage key はまだ変えない。
- Card 型はまだ変えない。
- `imagePath` に data URL が入っている既存カードの Storage 移行は、画像 upload 実装時に別途扱う。

## 12. 今回やらないこと

今回は SQL / RLS の設計案のみ。以下は実施しない。

- SQL 適用。
- migration file 作成。
- Supabase SDK 導入。
- Auth 実装。
- Storage upload 実装。
- Repository 差し替え。
- UI 変更。
- Card 型変更。
- package.json 変更。
- 実DBへの接続。

## 13. 実適用前の確認事項

- `primary key (user_id, id)` 方針で Supabase client の upsert が扱いやすいか。
- `cards.deck_id` と `decks.id` の複合 foreign key が migration 時に問題ないか。
- `uncategorized` deck を user ごとに seed / upsert する手順。
- 初期削除は物理削除で進め、soft delete は後続拡張にする判断でよいか。
- Storage RLS の path 判定を Supabase 公式仕様、推奨 helper、または `storage.foldername(name)` に合わせる。
- localStorage から Storage へ画像を移す migration の順序。
- Supabase rows と現行 `Card` / `Deck` / `EncounterMetadata` の adapter をどこに置くか。
- localStorage の `imagePath` data URL を Storage に移すタイミング。
- Storage object 削除を card 削除と同時に行うか、後続 cleanup にするか。
- `profiles` を初期から作るか、まず Auth のみで始めるか。
