# Supabase Google Auth Setup

## 目的

Life Cards に Google login / logout と session 確認だけを追加するための設定メモ。

この段階では、Repository 差し替え、decks / cards / encounters sync、DB 操作、Storage upload は行わない。

## Supabase 側の設定

1. Supabase Project を開く。
2. Authentication の Providers で Google を有効化する。
3. Google OAuth client ID を設定する。
4. Google OAuth client secret を設定する。
5. Site URL を設定する。
6. Redirect URLs に app の callback URL を追加する。

local callback URL 例:

```txt
http://localhost:3000/auth/callback
```

dev server が `3001` など別 port を使う場合は、その port の URL も追加する。

## Google Cloud Console 側の設定

Google OAuth client の Authorized redirect URI に、Supabase が提示する callback URL を登録する。

Supabase provider callback URL の例:

```txt
https://{project-ref}.supabase.co/auth/v1/callback
```

実際の URL は Supabase Dashboard の Google provider 設定画面で確認する。

## アプリ側の env

`.env.local.example` を参考に `.env.local` を作る。

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

注意:

- `.env.local` は commit しない。
- service role key は書かない。
- service role key を `NEXT_PUBLIC_` に入れない。
- browser で使うのは anon key のみ。

## 実装された認証フロー

1. `Google Login` を押す。
2. `signInWithOAuth({ provider: "google" })` で Google OAuth を開始する。
3. OAuth 完了後、`/auth/callback` に戻る。
4. callback route が `exchangeCodeForSession` を実行する。
5. 成功したら `/cards` に redirect する。
6. 失敗したら `/` に redirect する。
7. `Logout` で `supabase.auth.signOut()` を実行する。

## 追加ファイル

```txt
src/app/auth/callback/route.ts
src/components/auth/LoginButton.tsx
src/components/auth/LogoutButton.tsx
src/components/auth/AuthStatus.tsx
```

既存の Supabase client utility:

```txt
src/lib/supabase/client.ts
src/lib/supabase/server.ts
```

## まだ未実装

- Repository 差し替え。
- Supabase DB への decks sync。
- Supabase DB への cards sync。
- Supabase DB への encounters sync。
- SQL / RLS 適用。
- Storage upload。
- imagePath の Storage 移行。
- Email Auth。
- profile 編集。
- role 管理。
- 共有機能。
