# Supabase Apply SQL v1

調査日: 2026-06-07

対象: `/home/ozaki/projects/life_cards`

参照:

- `docs/supabase_sql_design.md`
- `docs/supabase_schema_design.md`
- `docs/supabase_repository_adapter_design.md`

## 結論

Supabase SQL Editor に貼る v1 SQL は、`decks` / `cards` / `encounters` / `usage_events` の 4 table に絞る。

- `profiles` は今回作らない。
- 削除方針は初期 v1 では物理削除にする。
- `cards.deleted_at` は今回作らない。
- Storage bucket / Storage policy は今回の SQL に含めない。
- RLS は全 table で `user_id = auth.uid()` に統一する。

理由:

- 現行 app は profile 情報を使っていない。
- Auth の正は Supabase Auth の `auth.users` で足りる。
- localStorage 版の削除挙動は物理削除であり、初期 sync と整合しやすい。
- `cards -> decks` と `encounters -> cards` の外部キー順序を明確にできる。
- Storage policy は helper / path policy の確認が別途必要なため、DB table 初回適用から分ける。

## 今回作る Table

```txt
public.decks
public.cards
public.encounters
public.usage_events
```

今回作らない table:

```txt
public.profiles
```

## 複合主キーレビュー

妥当。

現行 localStorage の id は user 間で衝突し得る。

- deck id 例: `uncategorized`
- card id 例: `card_${Date.now()}`

そのため、Supabase 上では user ごとの名前空間にする。

```txt
decks:     primary key (user_id, id)
cards:     primary key (user_id, id)
encounters: primary key (user_id, card_id)
```

Supabase client の upsert では、将来以下の conflict target を使う想定。

```txt
decks:     user_id,id
cards:     user_id,id
encounters: user_id,card_id
```

## 外部キー順序レビュー

妥当。

作成順:

1. `decks`
2. `cards`
3. `encounters`
4. `usage_events`

参照関係:

```txt
cards(user_id, deck_id)
  -> decks(user_id, id)

encounters(user_id, card_id)
  -> cards(user_id, id)
```

Migration / 初回 sync 順:

1. `uncategorized` deck を upsert
2. localStorage の decks を upsert
3. localStorage の cards を upsert
4. localStorage の encounters を upsert

`cards -> decks` は cascade delete にしない。deck 削除時は app 側で cards を `uncategorized` に移してから deck を削除する。

`encounters -> cards` は `on delete cascade` にする。card 物理削除時、対応する encounter は DB に cleanup させる。

## 削除方針

初期 v1 は物理削除でよい。

方針:

- card 削除: `public.cards` の row を delete
- encounter 削除: FK cascade
- deck 削除: 事前に cards を `uncategorized` へ移動してから delete
- Storage object cleanup: 後続フェーズ

`deleted_at` を今回作らない理由:

- 初期実装は physical delete として実装方針を固定したい。
- soft delete を入れると query 条件、index、cleanup、復元、端末間競合の扱いが増える。
- 将来 soft delete が必要になったら `alter table public.cards add column deleted_at timestamptz;` を別 migration として追加できる。

## profiles を含めるか

含めない。

理由:

- 現行アプリは display name / avatar / profile editing を持たない。
- RLS の主体は `auth.uid()` で十分。
- `auth.users` を認証の正として扱えば private sync の初期目的を満たせる。

profiles を追加するタイミング:

- display name をアプリ内で編集する。
- user preference を保存する。
- 将来の共有機能で user 表示名が必要になる。

## RLS 方針

全 table で Row Level Security を enable する。

各 table に以下を作る。

- 自分の row だけ select できる。
- 自分の row だけ insert できる。
- 自分の row だけ update できる。
- 自分の row だけ delete できる。

条件:

```sql
user_id = auth.uid()
```

この v1 では共有機能を作らないため、`is_shared` は RLS に使わない。

`usage_events` は App Store 前の最小 KPI 用に、自分の row だけ select / insert できる。
update / delete は初期では作らない。

## Supabase SQL Editor 用 最終 SQL 案

以下を Supabase SQL Editor に貼って実行する想定。

注意:

- 実行前に Supabase project が正しいことを確認する。
- 既存 table がある場合、`create table if not exists` は既存 column / constraint の差分修正をしない。
- 既存 policy がある場合、この SQL は同名 policy を drop してから再作成する。
- Storage bucket / Storage policy は含めない。

```sql
begin;

create extension if not exists pgcrypto;

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

create table if not exists public.cards (
  id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  deck_id text not null,
  front_text text,
  front_comment text,
  back_text text,
  image_path text,
  image_fit_mode text,
  default_image_key text,
  is_favorite boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id),
  foreign key (user_id, deck_id)
    references public.decks(user_id, id)
);

alter table public.cards
  add column if not exists image_fit_mode text;

alter table public.cards
  add column if not exists default_image_key text;

create table if not exists public.encounters (
  user_id uuid not null references auth.users(id) on delete cascade,
  card_id text not null,
  first_viewed_at timestamptz,
  last_viewed_at timestamptz,
  view_count integer not null default 0 check (view_count >= 0),
  last_reencounter_at timestamptz,
  next_reencounter_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, card_id),
  foreign key (user_id, card_id)
    references public.cards(user_id, id)
    on delete cascade
);

create index if not exists decks_user_sort_order_idx
  on public.decks (user_id, sort_order);

create index if not exists cards_user_deck_idx
  on public.cards (user_id, deck_id);

create index if not exists cards_user_updated_at_idx
  on public.cards (user_id, updated_at desc);

create index if not exists encounters_user_next_reencounter_at_idx
  on public.encounters (user_id, next_reencounter_at);

create table if not exists public.usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_name text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists usage_events_user_created_at_idx
  on public.usage_events (user_id, created_at desc);

create index if not exists usage_events_user_event_name_idx
  on public.usage_events (user_id, event_name);

alter table public.decks enable row level security;
alter table public.cards enable row level security;
alter table public.encounters enable row level security;
alter table public.usage_events enable row level security;

drop policy if exists "decks_select_own" on public.decks;
drop policy if exists "decks_insert_own" on public.decks;
drop policy if exists "decks_update_own" on public.decks;
drop policy if exists "decks_delete_own" on public.decks;

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

drop policy if exists "cards_select_own" on public.cards;
drop policy if exists "cards_insert_own" on public.cards;
drop policy if exists "cards_update_own" on public.cards;
drop policy if exists "cards_delete_own" on public.cards;

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

drop policy if exists "encounters_select_own" on public.encounters;
drop policy if exists "encounters_insert_own" on public.encounters;
drop policy if exists "encounters_update_own" on public.encounters;
drop policy if exists "encounters_delete_own" on public.encounters;

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

drop policy if exists "usage_events_select_own" on public.usage_events;
drop policy if exists "usage_events_insert_own" on public.usage_events;

create policy "usage_events_select_own"
  on public.usage_events
  for select
  using (user_id = auth.uid());

create policy "usage_events_insert_own"
  on public.usage_events
  for insert
  with check (user_id = auth.uid());

commit;
```

## 実DB適用前の注意点

- SQL Editor で実行する project が Life Cards 用 project であることを確認する。
- 先に Google Auth / Supabase Auth の設定を済ませる。
- 適用後、anon key で他 user の row が読めないことを確認する。
- `uncategorized` deck は user ごとに migration 前に必ず upsert する。
- deck 削除前には cards を `uncategorized` へ移動する。FK により cards が残った deck は削除できない。
- card 削除時は `encounters` が cascade delete されることを確認する。
- image data URL は DB に入れない方針を維持する。Storage upload は後続フェーズで扱う。
- Storage bucket `card-images` と Storage RLS は、この SQL とは別に設計確認してから適用する。
- `usage_events` は自前の最小 KPI 用。外部 analytics は使わず、app 側で `app_opened` を user / date 単位に抑制する。
- `updated_at` は default のみで自動更新 trigger は未作成。update 時は app / repository 側で値を更新する。
- 既存 table がある環境へ適用する場合は、この SQL だけでは schema drift を修正しない。差分を手動確認する。
