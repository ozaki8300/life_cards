# Reencounter Engine 実装前コード整理棚卸し

## 前提

- 対象は Life Cards の現行 UX 実装後のコード整理観点。
- 今回は調査レポートのみ。コード修正、import 変更、ファイル削除、lint 修正は行わない。
- `npm run lint` はユーザー指定により未実行。

## 1. 肥大化しているコンポーネント

### `src/components/cards/CardDetailModal.tsx`

約 500 行あり、現時点で最も責務が集中している。

主な責務:

- 詳細モーダル全体の表示
- front / back / photo の 3 状態回転
- 写真モードの zoom / drag / offset 管理
- ESC 操作
- 下部操作バー
- お気に入りボタン overlay
- QR 共有、編集、削除、前後送りの導線
- touch / click の誤発火制御

UX の中心部品として完成度は高いが、Reencounter Engine 実装時に「閲覧履歴」「再会判定」「最後に見た日時」などが追加されると、さらに肥大化しやすい。

### `src/components/CardFirstNav.tsx`

約 421 行あり、Deck と検索まわりの責務がかなり集まっている。

主な責務:

- Deck パネル開閉
- 検索 / 表示メニュー開閉
- About モーダル開閉
- Deck 作成
- Deck 削除
- Deck 並び替え
- 未分類 Deck 作成
- active deck 遷移
- ESC 操作
- Deck 一覧 UI
- 検索 UI

Deck 管理の状態と UI が同じファイル内にあり、今後 Reencounter 用のフィルタや表示モードを足すと読みづらくなる可能性が高い。

### `src/components/cards/TradingCardGrid.tsx`

約 253 行で中規模。まだ許容範囲だが、一覧表示以上の責務を持っている。

主な責務:

- grid / rail 表示
- CardTile の entrance animation wrapper
- tile flip 状態
- 詳細モーダルの選択 index
- 詳細モーダルの前後移動
- keyboard / swipe 操作
- 編集ダイアログ
- 共有ダイアログ
- お気に入り fallback state
- 削除処理の仮実装

「カード一覧」よりも「一覧から詳細体験までの controller」に近い。

### `src/components/CardHome.tsx`

約 159 行で、現状は肥大化というほどではない。

ただし Reencounter Engine の最初の接続点になりやすい。ここに scoring / selection / history update を直接入れると、すぐに責務が膨らむ。

## 2. 分離すべき責務

### CardDetailModal から分離したいもの

優先度高:

- 写真 zoom / drag / offset 管理
  - 候補: `usePhotoPanZoom`
- front / back / photo の循環・回転管理
  - 候補: `useCardDetailViewCycle`
- 下部操作バー
  - 候補: `CardDetailActionBar`
- 写真 face 表示
  - 候補: `CardDetailPhotoFace`

優先度中:

- お気に入り overlay button
  - 候補: `CardFavoriteOverlayButton`
- swipe / pointer 誤発火制御
  - view cycle hook に含めるか、詳細モーダル内に残す

CardFace の見た目は既に表示部品として安定しているため、ここには寄せすぎない方がよい。

### CardFirstNav から分離したいもの

優先度高:

- Deck パネル UI
  - 候補: `DeckPanel`
- Deck 行
  - 候補: `DeckListItem`
- Deck 作成 / 削除 / 並び替え操作
  - 候補: `useDeckActions`
- 検索 / 表示メニュー
  - 候補: `CardSearchMenu`

DeckRepository / CardRepository の呼び出しは動作済みなので、まず UI と操作関数を小さく分けるのが安全。

### TradingCardGrid から分離したいもの

優先度中:

- 詳細モーダルを開くための selection / navigation
  - 候補: `useCardSelectionNavigation`
- 編集 / 共有 dialog の表示 controller
  - 候補: `CardGridDialogs`
- CardTile 一覧描画
  - 候補: `CardTileList`

削除処理は現在 draft alert のため、Reencounter Engine 前に本実装するか、少なくとも責務を隔離しておくとよい。

### CardHome / cardHomeUtils から分離したいもの

`cardHomeUtils.ts` の `pickReencounterCards()` は Reencounter Engine の仮置き場になっている。

現状:

- favorite first
- 足りない分を通常カードから補充

将来:

- last viewed
- forgotten score
- randomness seed
- deck weight
- user action history

などに広がる可能性がある。

`CardHome.tsx` は engine の結果を受け取って表示へ渡す orchestrator に留め、score 計算は別 module に逃がすのがよい。

## 3. 未使用または古い可能性のあるファイル

### `src/components/cards/NewCardPreview.tsx`

未使用の可能性が高い。

確認結果:

- `rg "NewCardPreview"` では自身の定義以外の参照が見つからない。
- 現在の新規 / 編集プレビューは `CardFormPreview.tsx` が `CardFace` を使う形に寄っている。
- `NewCardPreview.tsx` は独自カード mock と `MarkdownMemo` 表示を持っており、CardFace 統一方針から外れている。

削除候補。ただし削除前に dynamic import や古い branch の利用がないか最終確認すること。

### `src/components/TradingCardGrid.tsx`

古い compatibility re-export の可能性が高い。

現状:

- 中身は `./cards/TradingCardGrid` の re-export のみ。
- 現在確認できる範囲では import されていない。
- 実体は `src/components/cards/TradingCardGrid.tsx`。

削除候補。ただし外部からの相対 import や未確認ページがないか、削除前に再度 `rg` で確認すること。

### `src/components/NewCardForm.tsx`

これは古い可能性はあるが、現時点では使用中。

確認結果:

- `src/app/cards/new/page.tsx`
- `src/app/cards/[deckId]/new/page.tsx`

が root 側の re-export を import している。

そのため削除対象ではない。将来的に page 側 import を `src/components/cards/NewCardForm.tsx` に寄せた後で整理するのが安全。

### 追加確認候補

今回の明示対象外だが、後続 cleanup で確認したいファイル:

- `src/components/DeckCard.tsx`
- `src/components/cards/DeckPickerModal.tsx`

未使用と断定はしない。削除判断の前に import 参照を確認する。

## 4. Reencounter Engine 実装前に触るべきファイル

### `src/components/cards/cardHomeUtils.ts`

最優先。

`pickReencounterCards()` が engine の仮実装に相当するため、Reencounter Engine 実装前に境界を作るとよい。

推奨:

- `pickReencounterCards()` を engine module へ移す、または wrapper にする
- `cardSearchText()` / `sortCardsByNewest()` は現状維持
- engine の input / output 型を先に決める

### `src/components/CardHome.tsx`

Reencounter Engine の接続点。

推奨:

- repository hydration と UI state は維持
- engine 呼び出しだけを明確に分離
- score 計算や履歴更新を CardHome 内に直接書かない

### `src/components/CardFirstNav.tsx`

Engine 用の表示切替や filter を追加する前に、DeckPanel と SearchMenu を分けた方が安全。

今のまま Reencounter 用 UI を足すと、Deck 管理と再会体験の操作が混ざる。

### `src/components/cards/TradingCardGrid.tsx`

Engine から選ばれたカードを表示する側としては重要。

ただし、Reencounter の選定ロジックはここに入れない方がよい。

触るなら:

- selection / navigation hook の切り出し
- delete draft alert の隔離または本実装
- detail modal controller の整理

### `src/components/cards/CardDetailModal.tsx`

閲覧イベントを記録するなら触る可能性がある。

ただしその前に、photo pan/zoom と view cycle を分けておくと安全。Engine 実装時に `onViewed` や `onReencounterSeen` のような callback を渡すだけにできる。

## 5. 触らない方がよい安定ファイル

### `src/components/cards/CardFace.tsx`

CardFace は一覧 / 詳細 / preview の表示統一の中心。UX 実装後の安定部品として扱うのがよい。

Reencounter Engine では基本的に触らない。

### `src/components/cards/CardTile.tsx`

一覧カードの flip / favorite / entrance animation が安定している。Engine 実装では表示対象が変わるだけなので、ここに score や scheduling logic を入れない方がよい。

### `src/components/cards/CardFormPreview.tsx`

CardFace を使う preview として整理済み。新規 / 編集 UX の安定領域。

### `src/components/cards/NewCardForm.tsx`

現在は `CardForm` と repository save の薄い wrapper。大きく触る必要はない。

root re-export の整理は後回しでよい。

### Repository 群

`deckRepository.ts` / `cardRepository.ts` は localStorage 構造の安定性に関わる。

Reencounter Engine で閲覧履歴や score を保存したくなっても、いきなり Card 型や保存構造を大きく変えない方がよい。まずは別 repository または optional metadata として設計するのが安全。

## 6. 安全なリファクタ順序

1. 未使用候補の最終確認
   - `NewCardPreview.tsx`
   - root `TradingCardGrid.tsx`
   - その他古い deck 関連 component
   - この段階では削除せず、参照確認だけ行う。

2. `CardDetailModal.tsx` の責務分離
   - `usePhotoPanZoom`
   - `useCardDetailViewCycle`
   - `CardDetailActionBar`
   - `CardDetailPhotoFace`
   - 見た目や挙動は変えず、内部整理だけにする。

3. `CardFirstNav.tsx` の責務分離
   - `DeckPanel`
   - `DeckListItem`
   - `CardSearchMenu`
   - Deck 作成 / 削除 / 並び替えの動作は変えない。

4. `TradingCardGrid.tsx` の controller 整理
   - selection / navigation を hook 化
   - edit / share dialog の表示責務を分ける
   - delete draft alert の扱いを明確化する。

5. Reencounter Engine の境界を作る
   - `pickReencounterCards()` を engine module に移す
   - `CardHome` は engine 結果を受け取るだけにする
   - 初期 engine は現在の favorite-first ロジックを維持して差分を小さくする。

6. Engine 用の永続化設計
   - lastViewedAt や encounter history が必要なら、Card 型を直接肥大化させる前に別 storage を検討する。
   - 保存データ移行が必要になる場合は、先に migration 方針を決める。

7. 最後に未使用ファイル削除
   - 参照確認後に `NewCardPreview.tsx` や root re-export を削除する。
   - 先に削除すると、リファクタ中の import 経路変更と混ざって原因切り分けが難しくなる。

## 補足メモ

Reencounter Engine 実装前の最大の注意点は、engine logic を UI component に直接入れないこと。

Life Cards の現在の UI は、CardFace / CardTile / CardDetailModal を中心に体験が固まっている。次の実装では、見た目を触るよりも「どのカードを、いつ、なぜ再会させるか」を `CardHome` の外側へ逃がす設計が重要になる。
