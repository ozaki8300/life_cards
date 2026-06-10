# Account Deletion Design

調査日: 2026-06-10

対象: Life Cards App Store 準備

## 結論

アカウント削除は、ブラウザ client から直接実行しない。Next.js の server route / server action で現在の Supabase session を検証し、server-only の service role client で削除する。

推奨する削除順序:

1. 現在の session を server 側で検証し、`user.id` を取得する。
2. `card-images` Storage の `users/{userId}/` 配下を削除する。
3. `share_cards` が存在する場合、`creator_user_id = userId` の row を削除する。
4. `auth.users` の対象 user を Supabase Admin API で削除する。
5. DB の FK cascade で `decks` / `cards` / `encounters` / `profiles` を削除する。
6. client 側は成功後に Supabase session と Life Cards localStorage を消し、signed-out state に戻す。

App Store 審査対策として最低限必要なのは、ログイン済みユーザーがアプリ内から自分のアカウント削除を開始でき、アカウントとユーザー由来データが実際に削除されること。単なる問い合わせ導線だけにするのは避ける。

## 参照

- Apple App Review Guidelines 5.1.1(v): アカウント作成をサポートする app は、app 内でアカウント削除を提供する必要がある。
- Supabase JavaScript `auth.admin.deleteUser`: user 削除は `service_role` key が必要で、server でのみ呼ぶ。`service_role` key を browser に露出してはいけない。
- `docs/supabase_apply_sql_v1.md`
- `docs/share_people_card_apply_sql_v1.md`
- `src/lib/supabase/*Repository.ts`
- `src/components/auth/AuthStatus.tsx`

## 現在の DB / RLS 構成

`docs/supabase_apply_sql_v1.md` の v1 schema:

- `public.decks.user_id references auth.users(id) on delete cascade`
- `public.cards.user_id references auth.users(id) on delete cascade`
- `public.encounters.user_id references auth.users(id) on delete cascade`
- `public.encounters (user_id, card_id)` は `public.cards(user_id, id) on delete cascade`
- RLS は `user_id = auth.uid()` で select / insert / update / delete を許可

このため、`auth.users` の user を物理削除すると、DB row としては以下が消える。

- `decks`
- `cards`
- `encounters`

`docs/share_people_card_apply_sql_v1.md` の追加 schema が適用済みの場合:

- `profiles.user_id references auth.users(id) on delete cascade`
- `share_cards.creator_user_id references auth.users(id) on delete set null`

このため、`profiles` は user 削除で消える。一方、`share_cards` は user 削除だけでは消えず、`creator_user_id` が `null` になって残る。

## 現在の Storage 構成

`src/lib/supabase/cardImageStorageRepository.ts` では、画像 path は以下。

```txt
card-images/users/{userId}/cards/{cardId}/front.webp
```

Storage object は Postgres FK cascade では削除されない。`cards.image_path` が消えても、Storage の object は残り得る。

既存の単体カード削除では、`CardSupabaseRepository.deleteCard()` が `cards.image_path` を読んでから DB row と Storage object を削除している。ただしアカウント削除では `auth.users` cascade に任せるだけだと Storage cleanup が走らない。

したがって、アカウント削除 API では Auth user 削除前に `card-images` bucket の `users/{userId}/` prefix を recursive に list/remove する。

## auth.users 削除を app 側から安全に実行できるか

browser client から安全には実行できない。

理由:

- Supabase Auth Admin の `deleteUser` は `service_role` key が必要。
- `service_role` key は RLS を迂回できる強い secret なので browser に置けない。
- user が自分の session だけで `auth.users` を直接 delete する通常 API はない。

安全な実装:

- `src/app/api/account/delete/route.ts` などの server route を作る。
- route 内で `createSupabaseServerClient()` により現在の session を確認する。
- session の `user.id` だけを削除対象にする。request body の userId は信用しない。
- server-only の service role client を別途作り、`supabase.auth.admin.deleteUser(userId, false)` を呼ぶ。
- service role client は `SUPABASE_SERVICE_ROLE_KEY` を使用し、`NEXT_PUBLIC_` prefix を付けない。

## service role が必要か

必要。

少なくとも以下で service role を使う。

- `auth.users` の削除
- RLS / Storage policy に依存しない確実な cleanup
- `share_cards.creator_user_id` が `on delete set null` になる前の強制削除

通常の signed-in user client で `decks/cards/encounters/profiles` を delete することは RLS 上可能だが、最終的な Auth user 削除が service role 必須なので、アカウント削除全体は server-side service role に寄せる方が安全。

## Storage 画像削除方針

削除対象:

```txt
bucket: card-images
prefix: users/{userId}/
```

実装案:

1. service role storage client で `users/{userId}` 以下を list する。
2. folder がある場合は再帰的にたどる。
3. file path を一定数ずつ `remove(paths)` する。
4. remove 失敗時は Auth user 削除へ進まず、ユーザーに再試行を促す。

注意:

- `cards` row から `image_path` を集める方式でもよいが、将来複数画像や orphan が出た場合に漏れる。
- prefix delete API がない前提で、list + remove を実装する。
- Auth user を先に削除すると Storage path の userId は分かっていても、DB から対象画像を辿れなくなる。

## share_cards / profiles の扱い

### profiles

`profiles.user_id on delete cascade` なので、Auth user 削除で消える。

ただし profile に `avatar_image_path` を使う場合は、avatar Storage path も `users/{userId}/...` 配下に置く設計にして、同じ prefix cleanup に含める。

### share_cards

現在の設計では `creator_user_id on delete set null`。これは共有 URL を残すには便利だが、アカウント削除では危険。

理由:

- `card_payload` は共有時点のカード snapshot を保持する。
- `creator_label` も残る。
- `creator_user_id` が `null` になると、通常の creator RLS policy では本人も操作できない orphan row になる。

推奨:

- アカウント削除 API で Auth user 削除前に `share_cards.creator_user_id = userId` を全削除する。
- 共有カードをアカウント削除後も残す仕様にはしない。

将来 migration で変えるなら:

```sql
creator_user_id uuid references auth.users(id) on delete cascade
```

ただし既存データと public share の寿命設計を再確認してからにする。

## 既存 repository 実装との関係

既存 repository は、通常 CRUD 用として維持する。

- `CardSupabaseRepository.deleteCard()` は単体カード削除時に Storage image も削除する。
- `DeckSupabaseRepository.deleteDeck()` は deck row を削除するが、cards が残る deck は FK で削除できない設計。
- `EncounterSupabaseRepository.deleteMetadata()` は単体 metadata 削除用。
- `ProfileSupabaseRepository` は browser client で自分の profile を read/upsert する。
- `ShareCardSupabaseRepository` は browser client で自分の share row を作成する。

アカウント削除は、これらを順番に browser から呼ぶ実装にしない。途中失敗や race condition が起きると、Auth user だけ残る、Storage だけ残る、share row が orphan になるなどの中途半端な状態になる。

専用の account deletion service を server-side に作る。

## UI 導線

自然な置き場所:

- `AuthStatus` の dropdown 内
- 現在の `username変更` / `Logout` の下
- 文言例: `アカウント削除`

推奨 UI:

1. dropdown の destructive item として `アカウント削除` を置く。
2. 確認 modal を開く。
3. 削除対象を短く明示する。
   - アカウント
   - cards / decks / reencounter data
   - uploaded images
   - shared card links
4. 最終確認として `削除する` ボタンを押す。
5. 実行中は disabled + spinner。
6. 成功後、localStorage を clear して `/cards` or `/` に戻し、signed-out state にする。
7. 失敗時は「削除できませんでした。時間をおいてもう一度お試しください。」程度にし、技術語を出しすぎない。

追加で安全性を高めるなら:

- Google OAuth の再認証導線を入れる。
- 「削除」と入力させる確認。
- App Store review 用 demo account でも操作できるようにする。

## App Store 審査上の最低ライン

最低限:

- app 内に、ログイン済みユーザーが見つけられるアカウント削除導線がある。
- 削除は問い合わせだけでなく、app 内操作で開始できる。
- 削除後、アカウントが使えなくなる。
- app が保持するユーザーデータが削除される。
- 削除対象や不可逆性を確認画面で説明する。

Life Cards では、App Store 申請前に少なくとも以下まで実装するのがよい。

- `AuthStatus` dropdown から削除 modal を開く。
- server route が Storage prefix / share_cards / Auth user を削除する。
- DB は FK cascade に任せる。
- 成功後は local session と localStorage を cleanup する。

## 推奨実装順序

1. `createSupabaseAdminClient()` を server-only で追加する。
   - `SUPABASE_SERVICE_ROLE_KEY` を使う。
   - browser bundle に入らない場所に置く。
2. `deleteStoragePrefix(bucket, prefix)` helper を server-only で作る。
   - `card-images/users/{userId}/` を再帰削除できるようにする。
3. `POST /api/account/delete` を作る。
   - server session を検証する。
   - request body の userId は受け取らない、または無視する。
   - Storage cleanup。
   - `share_cards` cleanup。
   - `auth.admin.deleteUser(userId, false)`。
4. client repository ではなく、専用 `deleteCurrentAccount()` client helper を作る。
   - API を叩くだけにする。
5. `AuthStatus` dropdown に `アカウント削除` を追加する。
6. `AccountDeletionDialog` を追加する。
   - 二段確認。
   - 実行中 feedback。
   - 失敗時 retry。
7. 成功後 cleanup。
   - `supabase.auth.signOut()`。
   - `life_cards.*` localStorage keys を削除。
   - UI を signed-out にする。
8. 手動検証。
   - cards/decks/encounters/profiles が消える。
   - share_cards が消える。
   - Storage object が消える。
   - 削除後ログインできない。

## 危険な実装

- `SUPABASE_SERVICE_ROLE_KEY` を `NEXT_PUBLIC_` env に置く。
- browser client から Admin API を呼ぶ。
- request body の `userId` を信用して削除する。
- Storage cleanup 前に `auth.users` を削除する。
- `share_cards` を消さずに `creator_user_id = null` の orphan row を残す。
- `cards` だけ delete して `auth.users` を残す。
- `auth.users` だけ delete して Storage を残す。
- RLS を一時的に緩めて削除を実現する。
- SQL Editor 手動運用を正式なアカウント削除導線にする。
- App 内導線を作らず、サポート連絡だけで済ませる。
- soft delete だけにして、ユーザーに「削除完了」と表示する。

## 未決事項

- `share_cards` を今後も `on delete set null` にするか、`on delete cascade` へ変えるか。
- profile avatar 等、カード画像以外の Storage path を作る場合の prefix 統一。
- 削除後の localStorage を完全削除するか、未ログイン local mode 用に残すか。
  - App Store 対応としては、ログイン済みクラウドアカウント削除後は少なくとも sync 済みの local cache を消す方が自然。
- 再認証を必須にするか。
