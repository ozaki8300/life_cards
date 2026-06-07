# Supabase Client Setup

## 追加 package

```txt
@supabase/supabase-js
@supabase/ssr
```

## 追加した utility

### Browser client

```txt
src/lib/supabase/client.ts
```

役割:

- browser component / client-side Repository から使う Supabase client を作る。
- `createBrowserClient` を使う。
- `NEXT_PUBLIC_SUPABASE_URL` と `NEXT_PUBLIC_SUPABASE_ANON_KEY` を読む。
- env が未設定の場合は分かりやすい error を出す。

### Server client

```txt
src/lib/supabase/server.ts
```

役割:

- Server Component / Server Action / Route Handler から使う Supabase client を作る入口。
- `createServerClient` を使う。
- Next.js App Router の async `cookies()` を使う。
- `server-only` 前提にして browser bundle へ混ざらないようにする。

## env sample

```txt
.env.local.example
```

使い方:

1. Supabase Project を作る。
2. Project URL と anon key を確認する。
3. `.env.local.example` を参考に、自分の環境で `.env.local` を作る。
4. `.env.local` は commit しない。

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

## Security

- service role key は扱わない。
- service role key を `NEXT_PUBLIC_` に入れない。
- browser client は anon key のみ使う。
- RLS を前提にして user data を守る。
- `.env.local` は `.gitignore` の `.env*` により除外される。

## まだ未実装

- 実DB接続を使った処理。
- Auth UI。
- Repository 差し替え。
- text-only sync。
- Storage upload。
- SQL / RLS 適用。
- migration 実装。
