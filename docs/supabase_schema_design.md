# Supabase Schema Design

## 目的

Life Cards を自分専用の PC / スマホ同期アプリとして使うための Supabase schema 方針を決める。

今回の前提:

- 個人利用を対象にする。
- PC とスマホの同期を目的にする。
- 公開共有は扱わない。
- 共同編集は扱わない。
- 3人運用やチーム利用はまだ対象外にする。

Supabase は公開サービスではなく、個人のカード、Deck、再会履歴を端末間で揃えるための private sync hub として扱う。

## 1. Table 案

最小構成:

- `profiles` または `users`
- `decks`
- `cards`
- `encounters`

方針:

- `auth.users` を認証の正とし、app 側の表示名などが必要になったら `profiles` を置く。
- `decks` / `cards` / `encounters` は必ず `user_id` を持つ。
- EncounterMetadata は Card 本体に混ぜず、`encounters` table として分離する。
- Reencounter Engine は Supabase を直接読まず、Repository / adapter が読み込んだデータを受け取る。

## 2. Profiles / Users

Supabase Auth の `auth.users` を前提にする。

app 用 profile table を作る場合:

```sql
profiles
```

候補 columns:

- `id uuid primary key references auth.users(id)`
- `display_name text`
- `created_at timestamptz`
- `updated_at timestamptz`

初期 MVP では profile 情報をほとんど使わないため、`profiles` は後回しでもよい。

## 3. Cards Table

候補 table:

```sql
cards
```

候補 columns:

- `id text primary key`
- `user_id uuid not null references auth.users(id)`
- `deck_id text not null`
- `front_text text`
- `front_comment text`
- `back_text text`
- `image_path text`
- `image_fit_mode text`
- `is_favorite boolean not null default false`
- `created_at timestamptz not null`
- `updated_at timestamptz not null`
- `deleted_at timestamptz`

補足:

- `id` は現行の `card_${Date.now()}` との互換を考え、まずは `text` が安全。
- 将来 server-side 作成に寄せる場合は `uuid` も検討できる。
- `deck_id` も現行の seed / localStorage deck id と互換を保つため、まずは `text` とする。
- `image_path` は画像本体ではなく Supabase Storage path または adapter が解決できる参照を保存する。
- `image_fit_mode` は `cover` / `blurExtend` を保存する。`null` は互換性のため `cover` 扱い。
- `deleted_at` は今回は optional。最小実装では物理削除でもよいが、端末間 sync の競合を考えると soft delete 余地を残す。

Card 型との対応:

- `front_text` -> `Card.frontText`
- `front_comment` -> `Card.frontComment`
- `back_text` -> `Card.backText`
- `image_path` -> `Card.imagePath`
- `image_fit_mode` -> `Card.imageFitMode`
- `is_favorite` -> `Card.isFavorite`
- `created_at` / `updated_at` -> `Card.createdAt` / `Card.updatedAt`

## 4. Decks Table

候補 table:

```sql
decks
```

候補 columns:

- `id text primary key`
- `user_id uuid not null references auth.users(id)`
- `name text not null`
- `sort_order integer not null default 0`
- `is_shared boolean not null default false`
- `created_at timestamptz not null`
- `updated_at timestamptz not null`

補足:

- `id` は現行 deck id と互換を取るため `text`。
- `uncategorized` deck は `id = 'uncategorized'` を維持する。
- `sort_order` は Deck パネルの並び替え保存に使う。
- `is_shared` は現行型に合わせて残すが、今回の single user private sync では公開共有には使わない。
- `cardCount` は保存せず、必要なら cards から集計する。現行 UI への adapter では算出して渡す。

## 5. Encounters Table

候補 table:

```sql
encounters
```

候補 columns:

- `user_id uuid not null references auth.users(id)`
- `card_id text not null`
- `first_viewed_at timestamptz`
- `last_viewed_at timestamptz`
- `view_count integer not null default 0`
- `last_reencounter_at timestamptz`
- `next_reencounter_at timestamptz`
- `updated_at timestamptz not null`

推奨 constraint:

```sql
primary key (user_id, card_id)
```

補足:

- EncounterMetadata は Card 内容ではなく、ユーザーとカードの接触履歴。
- `recordView` は `first_viewed_at`, `last_viewed_at`, `view_count`, `updated_at` を更新する。
- `recordReencounter` は通常閲覧更新に加え、`last_reencounter_at`, `next_reencounter_at` を更新する。
- `cards.deleted_at` を採用する場合、削除済み card の encounter を残すか削除するかは cleanup 方針で決める。

現行 localStorage との対応:

- `life_cards.encounters` の `Record<string, EncounterMetadata>` を Supabase では `(user_id, card_id)` の行として表す。
- Reencounter Engine に渡す時は Supabase rows を `Record<cardId, EncounterMetadata>` に adapter で変換する。

## 6. Storage

候補 bucket:

```txt
card-images
```

path 案:

```txt
users/{userId}/cards/{cardId}/front.webp
```

方針:

- Database に画像本体を入れない。
- `cards.image_path` には Storage object path を保存する。
- signed URL や public URL は永続保存しない。
- 画像はアップロード前にクライアント側で WebP 圧縮する。
- 現行の `imagePath` は当面維持し、adapter で local data URL / storage path / 表示 URL を吸収する。

削除時の検討:

- card 削除時に Storage object も削除するか。
- soft delete 時に画像を残すか。
- 画像差し替え時に旧 object を消すか。

この cleanup は Supabase Storage 実装時に別途決める。

## 7. RLS 方針

基本方針:

```sql
user_id = auth.uid()
```

`decks` / `cards` / `encounters`:

- 自分の row だけ `select` できる。
- 自分の row だけ `insert` できる。
- 自分の row だけ `update` できる。
- 自分の row だけ `delete` できる。

Storage:

- `card-images` bucket は user path 単位で制限する。
- `users/{userId}/...` の `{userId}` が `auth.uid()` と一致する object だけ操作できるようにする。
- public bucket にはしない前提で検討する。

注意:

- 今回は公開共有がないため、他 user の card / image を読む policy は作らない。
- `is_shared` は schema 上残しても、RLS では共有用途に使わない。
- 将来の共有機能は RLS 設計を別フェーズで作り直す。

## 8. localStorage との関係

現在の localStorage:

```txt
life_cards.cards
life_cards.decks
life_cards.encounters
```

方針:

- 既存 localStorage key は維持する。
- 初回ログイン時に localStorage の cards / decks / encounters を Supabase へ移行する。
- まずは Supabase primary / localStorage backup の方向で検討する。
- offline fallback や conflict resolution は別フェーズで整理する。

移行案:

1. ログイン後、localStorage の既存データを読む。
2. `decks` を upsert する。
3. `cards` を upsert する。
4. `encounters` を upsert する。
5. Supabase 側の取得結果を UI 用 `Card` / `Deck` / `EncounterMetadata` に adapter で変換する。

注意:

- migration のために Card 型を急に変えない。
- localStorage の data URL 画像を Storage path に移す処理は画像 upload 実装時に別途扱う。
- 既存ユーザーのローカルデータを壊さない。

## 9. 今回やらないこと

この document では方針だけを決める。今回は以下を実装しない。

- Supabase SDK 導入。
- Auth 実装。
- SQL 適用。
- RLS policy 適用。
- Storage upload 実装。
- 既存 Repository 差し替え。
- 共有機能。
- 3人運用。
- Card 型変更。
- UI 変更。
- localStorage key 変更。

## 10. 最小実装に進む時の順序案

1. Supabase project と env key の扱いを決める。
2. SQL schema / RLS policy を migration file または docs として作る。
3. Supabase client を client / server の境界に合わせて導入する。
4. `CardSupabaseRepository`, `DeckSupabaseRepository`, `EncounterSupabaseRepository` の adapter を小さく作る。
5. localStorage から Supabase への初回 migration を手動 trigger で実装する。
6. 画像は圧縮済み WebP Blob を `card-images` bucket に upload する。
7. `image_path` を `Card.imagePath` に解決する表示 adapter を作る。

この順序なら、UI と Reencounter Engine を大きく揺らさずに private sync へ進める。
