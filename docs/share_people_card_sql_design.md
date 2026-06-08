# Share / People Card SQL Design

## 目的

Life Cards の共有機能 / People Card 機能に向けて、`profiles` / `share_cards` の SQL 案と RLS 方針を整理する。

この document は `docs/share_people_card_design.md` を前提にした実装前設計である。まだ SQL は実行しない。コード実装、Supabase 設定変更、migration 適用も行わない。

今回の判断:

- 共有 Deck は扱わない。
- 共有は共同編集ではなく、カードの贈与として扱う。
- `share_cards` はカード本文を含むため、雑な public select policy は避ける。
- public token read を RLS だけで表現しようとしない。
- `/share/[token]` は app 側の制御層、つまり server route / RPC / edge function を通して読む。

## 1. 前提とスコープ

対象 table:

- `public.profiles`
- `public.share_cards`

既存 table との関係:

- `decks` / `cards` / `encounters` とは独立させる。
- 共有カードは元カードへの live reference ではなく snapshot とする。
- Import 時に受信者の `cards` table に新しい Card を作る。
- `share_cards.source_card_id` は creator 側の参考情報であり、Import 側では使わない。
- `encounters` metadata は share payload に含めない。

安全上の前提:

- `card_payload` に社外秘情報、顧客情報、個人情報、契約情報、認証情報などを入れない。
- Life Cards はそのような情報の安全な共有・保管を目的にしない。
- token を知っている人は share page を開ける可能性がある。

## 2. `public.profiles`

People Card 作成時の表示名や avatar 参照を持つ optional table とする。

SQL 案:

```sql
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  handle text,
  avatar_image_path text,
  representative_card_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

カラム方針:

- `user_id`: `auth.users(id)` と一致する app profile の primary key。
- `display_name`: share page や People Card で表示する名前。
- `handle`: 将来の公開 profile URL や user-friendly id に備える optional field。
- `avatar_image_path`: Supabase Storage path を想定する optional field。
- `representative_card_id`: 自分の代表 People Card を指す optional field。
- `created_at` / `updated_at`: profile row の管理用 timestamp。

RLS 案:

```sql
alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "profiles_delete_own" on public.profiles;

create policy "profiles_select_own"
  on public.profiles
  for select
  using (user_id = auth.uid());

create policy "profiles_insert_own"
  on public.profiles
  for insert
  with check (user_id = auth.uid());

create policy "profiles_update_own"
  on public.profiles
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "profiles_delete_own"
  on public.profiles
  for delete
  using (user_id = auth.uid());
```

方針:

- 自分の profile だけ select / insert / update / delete 可能。
- 一般公開 profile としては扱わない。
- `/share/[token]` で表示する名前は `profiles` を直接公開して読むのではなく、`share_cards.creator_label` に snapshot として保持する。

## 3. `public.share_cards`

`share_cards` は共有 token と共有時点の card snapshot を保持する table とする。

SQL 案:

```sql
create table if not exists public.share_cards (
  token text primary key,
  creator_user_id uuid references auth.users(id) on delete set null,
  creator_label text not null,
  source_card_id text,
  share_type text not null default 'card',
  card_payload jsonb not null,
  expires_at timestamptz not null,
  view_count integer not null default 0 check (view_count >= 0),
  import_count integer not null default 0 check (import_count >= 0),
  last_viewed_at timestamptz,
  created_at timestamptz not null default now()
);
```

推奨 constraint:

```sql
alter table public.share_cards
  add constraint share_cards_share_type_check
  check (share_type in ('card', 'people'));
```

index 案:

```sql
create index if not exists share_cards_creator_created_at_idx
  on public.share_cards (creator_user_id, created_at desc);

create index if not exists share_cards_expires_at_idx
  on public.share_cards (expires_at);
```

カラム方針:

- `token`: URL に載せる opaque token。推測困難な値にする。
- `creator_user_id`: 作成者・贈与者の user id。受信者には表示しない。
- `creator_label`: 共有時点の表示名 snapshot。受信者画面ではこの値を表示する。
- `source_card_id`: creator 側の元カード id。Import 側では使わない。
- `share_type`: `card` / `people`。
- `card_payload`: 共有時点の snapshot。元カードへの live reference ではない。
- `expires_at`: 初期仕様では作成から 7 日後。
- `view_count`: 表示成功回数。unique view ではない。
- `import_count`: Import 成功回数。
- `last_viewed_at`: 最後に表示成功した日時。
- `created_at`: share row 作成日時。

## 4. `card_payload jsonb` 方針

`card_payload` は表示と Import に必要な最低限の snapshot を持つ。

例:

```json
{
  "schemaVersion": 1,
  "card": {
    "frontText": "読書メモ",
    "frontComment": "あとで再会したい一節",
    "backText": "Markdown memo...",
    "linkUrl": "https://example.com",
    "imagePath": "signed-or-public-image-reference",
    "imageFitMode": "blurExtend",
    "createdAt": "2026-06-08",
    "updatedAt": "2026-06-08"
  },
  "creator": {
    "label": "K"
  }
}
```

含める候補:

- `schemaVersion`
- `card.frontText`
- `card.frontComment`
- `card.backText`
- `card.linkUrl`
- `card.imagePath`
- `card.imageFitMode`
- `card.createdAt`
- `card.updatedAt`
- `creator.label`

含めないもの:

- `deckId`
- `isFavorite`
- encounter metadata
- `creator_user_id`
- 閲覧者情報
- Import した user 情報

注意:

- payload は snapshot であり、元カード更新には追従しない。
- payload には機密情報を入れない。
- schema 変更に備えて `schemaVersion` を必ず入れる。

## 5. RLS 方針

`share_cards` はカード本文を含むため、public select を広く開けない。

作成者向け RLS:

```sql
alter table public.share_cards enable row level security;

drop policy if exists "share_cards_select_created" on public.share_cards;
drop policy if exists "share_cards_insert_created" on public.share_cards;
drop policy if exists "share_cards_update_created" on public.share_cards;
drop policy if exists "share_cards_delete_created" on public.share_cards;

create policy "share_cards_select_created"
  on public.share_cards
  for select
  using (creator_user_id = auth.uid());

create policy "share_cards_insert_created"
  on public.share_cards
  for insert
  with check (creator_user_id = auth.uid());

create policy "share_cards_update_created"
  on public.share_cards
  for update
  using (creator_user_id = auth.uid())
  with check (creator_user_id = auth.uid());

create policy "share_cards_delete_created"
  on public.share_cards
  for delete
  using (creator_user_id = auth.uid());
```

方針:

- insert / update / delete は `creator_user_id = auth.uid()` の作成者のみ。
- creator 自身は自分の share row を select 可能。
- 一般閲覧者向けに `share_cards` table を直接 public select で広く開けない。
- anonymous user が token を持っていても、table を直接 select できる policy は作らない。

## 6. `/share/[token]` read 方針

public token read は RLS だけで表現しようとしない。

理由:

- `share_cards.card_payload` にはカード本文が含まれる。
- token 条件付きの select policy を雑に作ると、意図せず payload を広く読ませる risk がある。
- expired 判定、view count 更新、payload shaping を app 側で制御したい。

推奨:

- `/share/[token]` は server route / RPC / edge function 経由で token lookup する。
- lookup 時に `expires_at > now()` を必ず確認する。
- expired row は payload を返さない。
- 受信者には `creator_user_id` を返さない。
- 表示には `creator_label` を使う。
- response payload は UI に必要な fields だけに shaping する。

lookup の疑似仕様:

1. token を受け取る。
2. token format を validation する。
3. `share_cards` を token で lookup する。
4. row がない場合は not found。
5. `expires_at <= now()` の場合は expired。
6. `card_payload` を response 用に shaping する。
7. view 成功として `view_count` と `last_viewed_at` を更新する。
8. share preview を返す。

## 7. count update 方針

view 成功時:

- `/share/[token]` の有効な preview response を返す時だけ `view_count` を increment する。
- 同時に `last_viewed_at = now()` を更新する。
- expired / not found / invalid token では increment しない。

Import 成功時:

- Import 処理が受信者の `cards` table への保存に成功した時だけ `import_count` を increment する。
- 未ログイン、Import cancel、validation error では increment しない。

SQL 更新例は実装時に検討する。count 更新は race condition を避けるため、RPC で atomic に扱う案が有力。

## 8. 期限 7 日

初期仕様では share token の有効期限を 7 日とする。

作成時方針:

```sql
expires_at = now() + interval '7 days'
```

挙動:

- `expires_at > now()` の row のみ preview 可能。
- expired row は payload を返さない。
- expired row でも creator は自分の share history として見られる可能性がある。

cleanup 方針:

- 初期実装では cleanup は必須にしない。
- 後続で Supabase scheduled job / cron / manual admin script を検討する。
- cleanup する場合は `expires_at < now() - interval '30 days'` など、猶予を持たせる案が安全。

## 9. token 方針

token は推測困難な opaque token とする。

方針:

- 連番や card id を使わない。
- user id や timestamp を露出しない。
- 十分な entropy を持つ random token を使う。
- URL safe な文字列にする。

例:

```txt
base64url(randomBytes(32))
```

token は credential に近い扱いであり、URL や QR の取り扱いに注意する。

## 10. 実適用前の確認事項

SQL 実行前に確認すること:

- `profiles` をこの timing で作るか、People Card 実装時まで待つか。
- `representative_card_id` に foreign key を張るか。初期は張らない案が安全。
- `share_cards.creator_user_id` を `on delete set null` でよいか。
- `creator_label` の fallback を app 側でどう決めるか。
- `share_type` constraint を migration に含めるか。
- public read を server route / RPC / edge function のどれで実装するか。
- count update を RPC で atomic にするか。
- 共有画像を public URL にするか、token 経由で署名 URL を発行するか。
- expired row cleanup をいつ実装するか。
- Vercel / Supabase production 環境で必要な env が揃っているか。

実装前に改めて確認すること:

- `card_payload` に機密情報を入れない UI warning が必要か。
- `/share/[token]` の noindex 対応。
- QR 共有時の注意文。
- Import 後に元カード日付をどこまで残すか。
- People Card を通常 Card subtype として扱うか、専用 template とするか。

## 11. 適用しないこと

この document 作成時点では以下を行わない。

- SQL 実行。
- Supabase table 作成。
- RLS policy 適用。
- Storage policy 変更。
- app code 実装。
- migration file 作成。
- git commit / push。
