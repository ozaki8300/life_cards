# Supabase Preimplementation Check

## 目的

Life Cards を Supabase Project 作成へ進める前に、現状の準備状態、未確定事項、最初に着手すべき実装単位を整理する。

今回は調査のみで、以下は行わない。

- Supabase SDK 導入。
- package 変更。
- `.env.local` 作成。
- 実DB接続。
- migration 作成。
- `src` 配下の変更。

## 1. 現状確認結果

### package.json

`package.json` に Supabase SDK は入っていない。

現在の主要 dependencies:

- `next`
- `react`
- `react-dom`
- `react-markdown`
- `remark-breaks`
- `remark-gfm`

未導入:

- `@supabase/supabase-js`
- `@supabase/ssr`
- Supabase Auth Helpers 系 package

確認結果:

- Supabase SDK 導入前の状態として問題なし。
- 次に実装へ入る場合は、Next.js 16 / App Router 前提で SDK の置き場所と client/server 境界を決めてから package 追加する。

### .gitignore

`.gitignore` には以下が含まれている。

```txt
.env*
```

確認結果:

- `.env.local` は `.env*` により除外される。
- Supabase URL / anon key / service role key を誤 commit しにくい状態。
- service role key は browser client へ絶対に渡さない。

## 2. Next.js App Router で Supabase client を置く場所

候補:

```txt
src/lib/supabase/client.ts
src/lib/supabase/server.ts
```

方針:

- browser から使う anon client は `client.ts` に置く。
- server component / route handler / server action から使う client は `server.ts` に分ける。
- service role client が必要になっても browser bundle に入れない。
- Repository adapter は Supabase client の詳細を UI に漏らさない。

初期 text-only sync では、まず client-side Supabase access で小さく始める案が現実的。

ただし Auth session の扱いを安定させるなら、Next.js App Router 向けの Supabase SSR 方針を確認してから導入する。

## 3. Auth 導入時の最小構成

### Google Auth のみで始める案

メリット:

- 個人利用 MVP と相性がよい。
- PC / スマホ間のログイン体験が簡単。
- password reset や email magic link 周りの運用を後回しにできる。
- 自分専用 private sync の検証速度が速い。

注意:

- Supabase 側で Google provider 設定が必要。
- Google Cloud Console 側の OAuth client / redirect URL 設定が必要。

### Email Auth も使う案

メリット:

- Google account に依存しない。
- 将来ユーザーを増やす時に選択肢が広い。

注意:

- email confirmation / magic link / password reset などの UX と設定が増える。
- SMTP / rate limit / メール到達性の確認が必要になる場合がある。
- 個人 MVP ではやや重い。

推奨:

- 個人利用 MVP は **Google Auth のみ** で始める。
- Email Auth は後続で追加する。

## 4. Repository Adapter 設計との接続点

現状:

- `CardHome` が `CardRepository`, `DeckRepository`, `EncounterRepository` を直接呼ぶ。
- `ReencounterEngine` は Repository / localStorage を直接知らない。
- `CardFace`, `CardTile`, `CardDetailModal`, `TradingCardGrid` は保存先を知らない。

安全な接続方針:

- まず既存 localStorage Repository を壊さない。
- Supabase 版 Repository を並列追加する。
- `CardHome` か、その上位 provider で repository set を切り替える。
- `ReencounterEngine.pick()` には今と同じく `cards`, `favoriteIds`, `metadataByCardId`, `today` を渡す。

将来候補:

```txt
src/lib/supabase/cardSupabaseRepository.ts
src/lib/supabase/deckSupabaseRepository.ts
src/lib/supabase/encounterSupabaseRepository.ts
```

または:

```txt
src/lib/repositories/localLifeCardsRepository.ts
src/lib/repositories/supabaseLifeCardsRepository.ts
```

初期は並列追加が安全。既存 `src/lib/cardRepository.ts`, `deckRepository.ts`, `encounterRepository.ts` は localStorage 版として残す。

## 5. text-only sync 最初の実装単位

候補:

- decks
- cards
- encounters

推奨順:

1. decks
2. cards
3. encounters

理由:

- `cards` は `(user_id, deck_id)` で `decks` を参照する。
- `encounters` は `(user_id, card_id)` で `cards` を参照する。
- SQL 設計上、migration / sync は `decks -> cards -> encounters` の順が自然。
- `uncategorized` deck を先に upsert しないと、削除 deck から移動された cards が参照不能になる。

最初の最小実装:

- `uncategorized` deck upsert。
- seed/localStorage decks を Supabase へ upsert。
- Supabase rows を現行 `Deck` 型へ map する adapter を作る。

その次:

- text-only cards sync。
- `imagePath` data URL は Storage 実装まで Supabase DB には入れない方針を維持する。

最後:

- encounters sync。
- `Record<cardId, EncounterMetadata>` へ戻す adapter を作る。

## 6. Supabase Free プラン前提の注意点

注意点:

- Storage 容量を節約するため、画像は必ず WebP 圧縮後に upload する。
- Database に base64 data URL を入れない。
- 個人 MVP では Free で検証しやすいが、画像を大量に入れると Storage 容量が先に効く。
- Auth provider 設定や redirect URL を local / production で分ける必要がある。
- Free project は一定条件で pause / 制限が入る可能性があるため、長期運用前に確認する。
- service role key は server-only。client bundle / `.env.local` の `NEXT_PUBLIC_` には入れない。

初期 sync の制限:

- まず text-only sync で検証する。
- Storage upload / signed URL / cleanup は後続フェーズに分ける。
- Reencounter Engine は Supabase を直接読まない。

## 7. Supabase 画面側で必要な準備

Project 作成前後に必要なこと:

1. Supabase Project を作成する。
2. Project URL と anon key を確認する。
3. Google Auth を使う場合、Authentication providers で Google を有効化する。
4. Google Cloud Console で OAuth client を作る。
5. Supabase の redirect URL を Google OAuth 側に設定する。
6. local development 用 redirect URL を Supabase 側に登録する。
7. production URL が決まったら production redirect URL も登録する。
8. SQL / RLS 設計をレビュー後、migration として適用する。
9. `card-images` bucket は Storage フェーズで作成する。
10. Storage policy は `split_part` 案ではなく、実適用前に Supabase 推奨 helper / `storage.foldername(name)` を確認する。

まだやらないこと:

- service role key を client に置く。
- public bucket として画像を公開する。
- schema 未レビューのまま SQL を適用する。
- Storage upload を text-only sync と同時に混ぜる。

## 8. 実装前に決めること

- Auth は Google のみにするか、Email も最初から入れるか。
- Supabase client の配置を `src/lib/supabase/client.ts` / `server.ts` にするか。
- Repository adapter を `src/lib/supabase` に置くか、`src/lib/repositories` に置くか。
- `CardHome` に repository set を props / context / module import のどれで渡すか。
- 初期 Supabase sync を user 操作で開始するか、自動 migration にするか。
- text-only sync 中に画像あり card をどう扱うか。
- localStorage の `imagePath` data URL を Storage に移すタイミング。
- card 削除時に Storage object cleanup を同時に行うか、後続 cleanup にするか。
- `profiles` table を初期から使うか、まず Auth のみで始めるか。

## 9. 推奨する次の一手

推奨:

1. 未追跡 docs を commit して設計状態を保存する。
2. Supabase Project を作成する。
3. Google Auth のみ有効化する。
4. SQL / RLS はまだ適用せず、最終レビューする。
5. SDK 導入前に、Repository adapter の置き場所を決める。
6. 最初の実装は `decks` の text-only sync から始める。

理由:

- decks は cards / encounters の親になるため、最初に同期境界を検証しやすい。
- `uncategorized` の upsert と sort_order の扱いを先に固められる。
- UI 変更を最小にしつつ、Supabase 接続の成功/失敗を検証できる。

## 10. やってはいけないこと

- `src` 配下を先に大きく変更しない。
- `package.json` に SDK を入れる前に Auth / Repository 方針を曖昧にしない。
- `.env.local` を commit しない。
- service role key を browser に出さない。
- Database に base64 画像を入れない。
- Reencounter Engine に Supabase / Repository import を入れない。
- Card 型を Supabase 都合で急に変更しない。
- Storage upload と text-only sync を同時に実装しない。
- RLS 未設定のまま個人データを入れない。

## 11. コード変更について

今回の確認ではコード変更していない。

変更対象はこの document の追加のみ。

次に実装へ進む場合も、まずは Supabase SDK 導入と client 境界作成を小さく行い、既存 localStorage Repository を壊さずに Supabase 版を並列追加する。
