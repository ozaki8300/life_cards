# Share / People Card Apply SQL v1

## 目的

Life Cards の共有機能 / People Card 機能に向けて、Supabase SQL Editor に貼り付けられる適用用 SQL を整理する。

この document は以下を前提にした SQL 適用前ドキュメントである。

- `docs/share_people_card_design.md`
- `docs/share_people_card_sql_design.md`

まだ SQL は実行しない。コード実装、Supabase 設定変更、migration 適用、git commit / push も行わない。

## 適用対象

- `public.profiles`
- `public.share_cards`
- index
- `share_type` check constraint
- RLS enable
- `profiles` policies
- `share_cards` creator policies

## 今回含めないもの

- `/share/[token]` の public read 用 server route 実装
- `/share/[token]` の public read 用 RPC
- edge function
- `view_count` / `import_count` の atomic increment RPC
- expired row cleanup job
- Storage policy

`share_cards` はカード本文を含むため、直接 public select で広く開けない。一般閲覧者向けの token lookup は、次フェーズで server route / RPC / edge function 経由にする。

## SQL 適用前の注意

- Supabase project が Life Cards 本番 / 検証のどちらかを必ず確認する。
- 既存に `public.profiles` / `public.share_cards` がある場合は、column 差分を確認してから適用する。
- `share_cards.creator_user_id` は受信者には返さない。
- 受信者画面では `creator_label` を共有時点の表示名 snapshot として使う。
- `expires_at` は app 側で作成時に `now + 7 days` を設定する。
- `card_payload` は snapshot であり、元カードへの live reference ではない。
- `card_payload` に社外秘情報、顧客情報、個人情報、契約情報、認証情報などを入れない。
- `view_count` / `import_count` 更新は、別フェーズで atomic RPC を検討する。
- `/share/[token]` の lookup では、必ず `expires_at > now()` を確認する。

## Supabase SQL Editor 用 SQL

```sql
begin;

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  handle text,
  avatar_image_path text,
  representative_card_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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

alter table public.share_cards
  drop constraint if exists share_cards_share_type_check;

alter table public.share_cards
  add constraint share_cards_share_type_check
  check (share_type in ('card', 'people'));

create index if not exists share_cards_creator_created_at_idx
  on public.share_cards (creator_user_id, created_at desc);

create index if not exists share_cards_expires_at_idx
  on public.share_cards (expires_at);

alter table public.profiles enable row level security;
alter table public.share_cards enable row level security;

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

commit;
```

## RLS 方針

`profiles`:

- 自分の profile だけ select / insert / update / delete 可能。
- 条件は `user_id = auth.uid()`。
- public profile table としては開けない。

`share_cards`:

- creator 自身だけが自分の share row を select / insert / update / delete 可能。
- 条件は `creator_user_id = auth.uid()`。
- `creator_user_id` が `null` になった row は、通常の creator policy では操作できない。
- 一般閲覧者向けに `share_cards` table を直接 public select で開けない。

## `/share/[token]` の別フェーズ方針

一般閲覧者が `/share/[token]` を開く処理は、この SQL には含めない。

次フェーズで server route / RPC / edge function のいずれかを用意し、app 側の制御層を通して `share_cards` を読む。

lookup 時の必須条件:

- token は推測困難な opaque token にする。
- `expires_at > now()` を必ず確認する。
- 期限切れの場合は payload を返さない。
- 返却 payload に `creator_user_id` を含めない。
- 表示には `creator_label` を使う。
- 表示成功時のみ `view_count` と `last_viewed_at` を更新する。
- Import 成功時のみ `import_count` を更新する。

`view_count` / `import_count` は race condition を避けるため、別フェーズで atomic RPC 化を検討する。

## expired row cleanup 方針

期限切れ row の削除は、この SQL には含めない。

別フェーズで以下のどちらかを検討する。

- Supabase scheduled job / pg_cron による定期削除。
- 管理者用 script による手動 cleanup。

初期案では、`expires_at < now() - interval '30 days'` のように一定猶予を持って削除する。

## 実適用前の確認事項

- `profiles.user_id` を primary key として問題ないか。
- `profiles.representative_card_id` に FK を張らない方針でよいか。
- `share_cards.source_card_id` は Import 側で使わない方針でよいか。
- `share_type` は `card` / `people` の 2 値で足りるか。
- app 側で `expires_at = now + 7 days` を必ず入れる実装にするか。
- app 側で `creator_label` を空にしない fallback を用意するか。
- `/share/[token]` の public read を RLS policy だけで表現しない方針で合意できているか。
- Storage 画像を共有 payload でどう扱うか。

