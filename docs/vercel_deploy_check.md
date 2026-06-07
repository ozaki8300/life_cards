# Life Cards Vercel Deploy Check

調査日: 2026-06-07

対象: `/home/ozaki/projects/life_cards`

## 結論

Life Cards は、現状のまま Vercel にデプロイ可能な構成です。

- Next.js App Router 構成として成立している。
- `package.json` には Vercel の標準 Next.js build に必要な `build` script がある。
- `npm run build` は成功した。
- `.env.local` の値は Vercel Project Settings の Environment Variables に移行できる。
- Google Auth / Supabase Auth は、本番 URL が決まり次第 callback URL を追加すれば動作可能な構成。

## 1. Next.js App Router として Vercel で動作可能か

可能。

確認した構成:

- App Router: `src/app`
- Layout: `src/app/layout.tsx`
- Pages:
  - `src/app/page.tsx`
  - `src/app/cards/page.tsx`
  - `src/app/cards/new/page.tsx`
  - `src/app/cards/[deckId]/page.tsx`
  - `src/app/cards/[deckId]/new/page.tsx`
- Route Handler:
  - `src/app/auth/callback/route.ts`

Next.js 同梱 docs では、Vercel は Next.js の verified adapter とされている。Route Handler は `app` directory 内の `route.ts` として定義する方式で、現在の `/auth/callback` 実装はこの形に合っている。

build 結果でも `/auth/callback` は dynamic server-rendered route として認識された。

## 2. package.json に問題がないか

大きな問題なし。

確認した内容:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint"
  },
  "dependencies": {
    "next": "16.2.7",
    "react": "19.2.4",
    "react-dom": "19.2.4",
    "@supabase/ssr": "^0.10.3",
    "@supabase/supabase-js": "^2.107.0"
  }
}
```

Vercel では通常 `npm install` / `npm run build` が使われるため、`build` script がある現在の構成で問題ない。

補足:

- `package-lock.json` は存在し、lockfileVersion は 3。
- `private: true` はアプリ用途として問題なし。
- `engines.node` は未指定。Vercel 側の Node.js Runtime は Project Settings で必要に応じて固定する。未指定でも標準環境で build は通る。

## 3. build が通るか

成功。

実行コマンド:

```bash
npm run lint
npm run build
```

結果:

- `npm run lint`: 成功
- `npm run build`: 成功

build summary:

```txt
▲ Next.js 16.2.7 (Turbopack)
- Environments: .env.local

✓ Compiled successfully
✓ Generating static pages (15/15)

Route (app)
┌ ○ /
├ ○ /_not-found
├ ƒ /auth/callback
├ ○ /cards
├ ● /cards/[deckId]
├ ● /cards/[deckId]/new
└ ○ /cards/new
```

## 4. .env.local を使う構成が Vercel に移行可能か

可能。

現在の `.env.local.example`:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

実装側で参照している環境変数:

- `src/lib/supabase/client.ts`
- `src/lib/supabase/server.ts`

参照キー:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Next.js では `.env.local` は repository に commit せず、deploy 環境では hosting platform の環境変数として設定する。`NEXT_PUBLIC_` prefix の値は browser bundle に公開されるため、Supabase anon key のみを入れる。service role key は入れない。

注意:

- `NEXT_PUBLIC_` env は build 時に client bundle へ埋め込まれる。
- Vercel では Production / Preview / Development の各 environment に同じキーを設定する。
- `.env.local` は `.gitignore` 対象で、commit しない。

## 5. Vercel に設定すべき環境変数一覧

必須:

| Key | Value | Environment | Notes |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL | Production / Preview / Development | 例: `https://{project-ref}.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon public key | Production / Preview / Development | browser で使う公開 anon key |

設定しない:

| Key | Reason |
| --- | --- |
| Supabase service role key | client bundle に混入すると危険。現実装でも不要。 |
| Google OAuth client secret | Supabase 側に設定する値であり、Next.js app 側では不要。 |

## 6. Google Auth で Vercel デプロイ時に追加すべき URL

Google Cloud Console の OAuth client に追加するのは、Supabase が提示する provider callback URL。

追加する Authorized redirect URI:

```txt
https://{project-ref}.supabase.co/auth/v1/callback
```

これは Supabase Dashboard の Authentication > Providers > Google の画面で表示される callback URL を正として確認する。

Life Cards の app 側 callback URL:

```txt
https://{vercel-production-domain}/auth/callback
```

ただし、この app 側 URL は Google Cloud Console ではなく、Supabase Auth の URL Configuration に追加する。

## 7. Supabase URL Configuration に追加すべき URL

Supabase Dashboard > Authentication > URL Configuration に設定する。

Site URL:

```txt
https://{vercel-production-domain}
```

Redirect URLs:

```txt
https://{vercel-production-domain}/auth/callback
```

Preview Deployments で Google Auth を確認する場合は、必要に応じて Preview URL も追加する。

例:

```txt
https://{vercel-preview-domain}/auth/callback
```

ローカル開発を継続する場合は、既存の local callback も残す。

```txt
http://localhost:3000/auth/callback
```

dev server が別 port を使う場合:

```txt
http://localhost:3001/auth/callback
```

## 8. デプロイ前に commit すべきファイル一覧

現在 `git status --short` は調査前時点で clean。

今回の調査で commit 対象になる新規ファイル:

```txt
docs/vercel_deploy_check.md
```

Vercel deploy に必要な既存 tracked files はすでに repository 管理下にある。

主要な deploy 必須ファイル:

```txt
package.json
package-lock.json
next.config.ts
tsconfig.json
postcss.config.mjs
eslint.config.mjs
.env.local.example
src/app/**
src/components/**
src/data/**
src/domain/**
src/lib/**
public/**
```

commit しないもの:

```txt
.env.local
.next/
node_modules/
tsconfig.tsbuildinfo
next-env.d.ts
.vercel/
```

## デプロイ手順

1. Vercel で repository を import する。
2. Framework Preset が Next.js になっていることを確認する。
3. Install Command は標準のままにする。
4. Build Command は `npm run build`。
5. Output Directory は未指定のままにする。
6. Environment Variables に以下を設定する。
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
7. Deploy する。
8. 発行された production domain を確認する。
9. Supabase URL Configuration に production Site URL と `/auth/callback` Redirect URL を追加する。
10. Google Cloud Console の Authorized redirect URI に Supabase provider callback URL が入っていることを確認する。
11. 本番 URL で Google Login を試す。

## 最終判定

デプロイ可能。

デプロイ前の必須作業は、Vercel 環境変数の登録、Supabase URL Configuration の production URL 追加、Google OAuth 側の Supabase callback URL 確認。
