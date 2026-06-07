# Supabase Google Auth Design

## 目的

Life Cards の Supabase private sync に向けて、最小の Google Auth 実装方針を決める。

今回は設計のみで、コード変更、実DB接続、`.env.local` 作成は行わない。

## 1. 認証方式

初期方針:

- Google Auth のみで始める。
- Email Auth は後続にする。

理由:

- 個人利用 MVP と相性がよい。
- PC / スマホ間で同じ Google account にログインすれば sync 検証しやすい。
- password reset / magic link / email confirmation などの設計を後回しにできる。
- Auth UI を最小にできる。

後続候補:

- Email magic link。
- Email + password。
- profile 編集。
- 複数 provider。

## 2. 認証フロー

想定 flow:

1. ユーザーが Login button を押す。
2. browser client で `signInWithOAuth({ provider: "google" })` を呼ぶ。
3. Supabase / Google OAuth 画面へ遷移する。
4. OAuth 完了後、`/auth/callback` に戻る。
5. callback route で `exchangeCodeForSession` を実行する。
6. session cookie が保存される。
7. `/cards` へ戻る。

概念コード:

```ts
await supabase.auth.signInWithOAuth({
  provider: "google",
  options: {
    redirectTo: `${origin}/auth/callback`,
  },
});
```

callback route の概念:

```ts
const code = request.nextUrl.searchParams.get("code");

if (code) {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.exchangeCodeForSession(code);
}

return NextResponse.redirect(new URL("/cards", request.url));
```

注意:

- callback route は App Router の Route Handler として作る。
- `exchangeCodeForSession` は server client で行う。
- redirect 先はまず `/cards` でよい。
- `next` query を使った戻り先制御は後続で検討する。

## 3. user_id の扱い

Supabase Auth の user id を全 table の `user_id` に使う。

方針:

- `session.user.id` を `decks.user_id`, `cards.user_id`, `encounters.user_id` に保存する。
- RLS では `auth.uid()` と `user_id` を一致させる。
- app 側で user id を手入力させない。
- client から渡された user id を信頼しすぎず、RLS で必ず保護する。

Repository adapter との関係:

- Supabase Repository は session user id を前提に query する。
- `ReencounterEngine` は user id を知らない。
- `CardHome` もできるだけ user id の細部を知らず、repository set / provider で吸収する。

## 4. Supabase 画面で必要な設定

Supabase 側:

1. Authentication providers で Google を有効化する。
2. Google OAuth client ID を設定する。
3. Google OAuth client secret を設定する。
4. Site URL を設定する。
5. Redirect URL を設定する。

Google Cloud Console 側:

1. OAuth client を作成する。
2. Authorized redirect URI に Supabase callback URL を設定する。
3. local development / production の URL を整理する。

redirect URL の考え方:

- app 側 callback route: `/auth/callback`
- Supabase Auth の provider callback URL も Google 側に登録する必要がある。
- local: `http://localhost:3000/auth/callback` など。
- dev server が別 port を使う場合があるため、実装時に使用 port を確認する。
- production URL は deploy 先が決まってから追加する。

## 5. アプリ側で必要なファイル案

既存:

```txt
src/lib/supabase/client.ts
src/lib/supabase/server.ts
```

追加候補:

```txt
src/app/auth/callback/route.ts
src/components/auth/LoginButton.tsx
src/components/auth/LogoutButton.tsx
```

### callback route

責務:

- OAuth callback の `code` を読む。
- `exchangeCodeForSession` を呼ぶ。
- 成功後 `/cards` へ redirect する。
- error 時の戻り先を決める。

### LoginButton

責務:

- browser client を作る。
- Google OAuth を開始する。
- UI は最小にする。

### LogoutButton

責務:

- browser client または server action 経由で sign out する。
- sign out 後の遷移先を決める。

## 6. やらないこと

初期 Google Auth 実装では以下をやらない。

- Email Auth。
- profile 編集。
- role 管理。
- 公開共有。
- 共同編集。
- Storage upload。
- Repository 差し替え。
- text-only sync。
- SQL / RLS の適用。
- card image の Storage 移行。

## 7. 実装順序

推奨順:

1. SDK / client 境界を追加する。
2. `/auth/callback` route を作る。
3. `LoginButton` を作る。
4. `LogoutButton` を作る。
5. session 確認の最小表示または debug 導線を作る。
6. decks text-only sync に進む。

今回時点:

- SDK / client 境界は追加済み。
- Auth UI は未実装。
- callback route は未実装。
- Repository 差し替えは未実装。

## 8. 実装時の注意

- `.env.local` は commit しない。
- service role key は使わない。
- browser に出すのは anon key のみ。
- Auth 成功後も RLS を前提にする。
- `CardHome`, Repository, ReencounterEngine へ一気に接続しない。
- まず login / logout / session のみ確認する。

## 9. 最小完了条件

Google Auth の最小実装完了条件:

- Login button から Google OAuth に進める。
- `/auth/callback` で session exchange できる。
- callback 後 `/cards` に戻る。
- Logout button で sign out できる。
- session user id が取得できる。
- 既存 localStorage UX は壊れない。

この段階では Supabase DB への cards / decks / encounters sync はまだ行わない。
