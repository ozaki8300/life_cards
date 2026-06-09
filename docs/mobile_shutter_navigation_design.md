# Mobile Shutter Navigation Design

## 目的

Life Cards のスマホ向けカード一覧に、中央下のシャッターボタンで「次のカードを画面中央へ送る」実験機能を追加するための実装前設計を残す。

この document は設計案であり、コード実装は行わない。

狙い:

- スマホで縦スクロールしながらカードを見る操作を軽くする。
- 片手操作で次カードへ進める。
- 不要になった場合に、安全に削除できる実験機能として閉じ込める。

対象:

- 通常のカード一覧。
- Deck 絞り込み後のカード一覧。
- 検索 / favorite タブ適用後のカード一覧。

対象外:

- 今日の再会カード送り。
- カード配列の並び替え。
- 横スライダー化。
- 詳細モーダルを開く操作。
- Reencounter Engine への組み込み。
- `TradingCardGrid` へのロジック直書き。

## 1. 基本仕様

シャッターボタンはモバイル viewport でのみ表示する。

ユーザーがボタンを押すと、現在のカード一覧で「次のカード」にあたるカード要素を探し、そのカードの中心が viewport の中央付近に来るように縦スクロールする。

想定動作:

1. ユーザーが `/cards` または Deck ページを開く。
2. 画面下中央に小さな固定ボタンが出る。
3. ボタンを押す。
4. 現在 viewport 中央に最も近いカード、または viewport 中央より下にある最初のカードを基準にする。
5. 次のカードへ `scrollIntoView` または `window.scrollTo` で移動する。
6. 最後の表示カードに到達した場合は何もしない、または先頭に戻らない。

初期仕様では wrap-around はしない。

## 2. hook 案: `useMobileCardShutterNavigation`

配置案:

```txt
src/components/cards/mobileShutter/useMobileCardShutterNavigation.ts
```

責務:

- 表示中カード DOM の登録。
- 現在カード index の推定。
- 次カードへの scroll 実行。
- 検索 / Deck 切替 / 削除などでの reset。
- mobile / enabled 判定。

hook interface 案:

```ts
type UseMobileCardShutterNavigationInput = {
  enabled: boolean;
  itemIds: string[];
  scrollOffsetPx?: number;
};

type UseMobileCardShutterNavigationResult = {
  canGoNext: boolean;
  goNext: () => void;
  registerItem: (cardId: string) => (element: HTMLElement | null) => void;
  reset: () => void;
};
```

設計方針:

- hook は `Card` の中身を知らない。
- hook は `cardId` と DOM element だけを見る。
- hook は localStorage / Supabase を読まない。
- hook は Reencounter metadata を読まない。
- hook は一覧順を変えない。

内部状態:

- `itemElementsRef: Map<string, HTMLElement>`
- `lastFocusedCardIdRef: string | null`
- `lastItemSignatureRef: string`

スクロール対象の決め方:

- `itemIds` の順序を正とする。
- viewport 中央 `window.innerHeight / 2` に最も近い登録済み要素を探す。
- その要素の次 index を対象にする。
- まだ中央カードが不明な場合は、viewport 中央より下にある最初のカードを対象にする。
- 対象がない場合は `canGoNext = false` とする。

scroll 実装案:

```ts
const targetTop =
  window.scrollY +
  targetRect.top -
  (window.innerHeight - targetRect.height) / 2 +
  scrollOffsetPx;

window.scrollTo({
  top: Math.max(0, targetTop),
  behavior: "smooth",
});
```

`scrollIntoView({ block: "center" })` でもよいが、fixed header / safe area / 下部ボタンとの干渉を調整しづらい。初期実装では `window.scrollTo` の方が制御しやすい。

## 3. UI 部品案: `MobileCardShutterButton`

配置案:

```txt
src/components/cards/mobileShutter/MobileCardShutterButton.tsx
```

責務:

- 見た目。
- click / tap 受付。
- disabled 表示。
- mobile のみ表示。
- 実験機能であることを UI から主張しすぎない。

props 案:

```ts
type Props = {
  disabled?: boolean;
  onClick: () => void;
};
```

表示位置:

- `fixed`
- `left-1/2`
- `bottom-[calc(env(safe-area-inset-bottom)+1rem)]`
- `z-40` 程度

見た目:

- 丸ボタン。
- 既存の丸ボタン調に合わせる。
- text label ではなく icon か簡素な記号を優先。
- 例: `↓` または lucide icon が利用可能なら `ChevronDown` / `CircleDot`。

注意:

- Card detail modal 表示中は出さない。
- share dialog / edit dialog 表示中も出さない。
- `TradingCardGrid` の `selectedCard` がある場合は非表示にするのが安全。

## 4. 設定 ON/OFF 案

この機能は不要になる可能性があるため、必ず feature flag 的に切れるようにする。

候補:

1. 定数 flag
2. localStorage 設定
3. URL query

最小案:

```ts
const ENABLE_MOBILE_SHUTTER_NAVIGATION = false;
```

実験を始める時だけ `true` にする。

ユーザー設定として試す場合:

- K dropdown または About には置かない。
- 初期は hidden setting に近い扱いでよい。
- localStorage が `enabled` のときのみ表示する。

推奨:

- 最初は定数 flag + localStorage override。
- public UI の設定項目にはしない。

## 5. localStorage key 案

key:

```txt
life-cards.mobile-shutter-navigation.enabled
```

値:

```txt
true
false
```

補足:

- 既存の `STORAGE_KEYS` に追加するなら `mobileShutterNavigationEnabled`。
- 実験削除時は key が残っても害がないようにする。
- key を読めない環境では disabled 扱い。

## 6. `TradingCardGrid` との接続方法

`TradingCardGrid` にロジックを直書きしない。接続だけを持たせる。

最小接続案:

1. `TradingCardGrid` で `displayCards` を持つ。
2. `useMobileCardShutterNavigation({ enabled, itemIds })` を呼ぶ。
3. card wrapper `<div>` に `ref={registerItem(card.id)}` を渡す。
4. grid layout のときだけ `MobileCardShutterButton` を表示する。
5. rail layout、つまり今日の再会では無効化する。

接続イメージ:

```tsx
const shutterNavigation = useMobileCardShutterNavigation({
  enabled: layout === "grid" && isMobileShutterEnabled,
  itemIds: displayCards.map((card) => card.id),
});

const cardTiles = displayCards.map((card) => (
  <div ref={shutterNavigation.registerItem(card.id)}>
    <CardTile ... />
  </div>
));

{layout === "grid" ? (
  <MobileCardShutterButton
    disabled={!shutterNavigation.canGoNext}
    onClick={shutterNavigation.goNext}
  />
) : null}
```

この場合、`TradingCardGrid` は「hook と button をつなぐだけ」になる。カード選定や scroll 計算は hook に閉じる。

## 7. reset 条件

以下では navigation state を reset する。

- 検索 query が変わり、`cards` の ID 並びが変わったとき。
- Deck 切替で `cards` の ID 並びが変わったとき。
- favorite タブ切替で `cards` の ID 並びが変わったとき。
- Load More で表示対象が増えたとき。
- カード削除で対象 ID が消えたとき。
- カード追加で ID 並びが変わったとき。

実装上は `itemIds.join("|")` の signature を hook に渡し、signature 変化で以下を行う。

- `lastFocusedCardIdRef = null`
- stale element を `itemElementsRef` から削除
- `canGoNext` を再計算

削除時の注意:

- `lastFocusedCardId` が削除された場合は、現在 viewport 中央から再推定する。
- 削除直後に自動スクロールしない。

検索 / Deck 切替時の注意:

- 一覧先頭へ scroll するかは既存 UX に合わせる。
- shutter hook は勝手に先頭へ scroll しない。

## 8. 削除しやすいファイル構成

実験機能として消しやすくするため、専用 directory に閉じ込める。

推奨構成:

```txt
src/components/cards/mobileShutter/
  MobileCardShutterButton.tsx
  useMobileCardShutterNavigation.ts
  mobileShutterSettings.ts
  index.ts
```

`TradingCardGrid` 側の変更は以下だけに抑える。

- import 1 行。
- hook 呼び出し。
- card wrapper ref 接続。
- button 描画。

削除時は:

1. `src/components/cards/mobileShutter/` を削除。
2. `TradingCardGrid` の import / hook / ref / button を削除。
3. localStorage key は放置可能。

## 9. 実装難易度

難易度: 中。

簡単な点:

- データ取得や Supabase に触れない。
- Reencounter Engine に触れない。
- Card の並び順を変えない。
- DOM 描画済みカードだけを対象にできる。

難しい点:

- mobile Safari の smooth scroll と fixed UI の干渉。
- viewport 中央判定の安定性。
- 検索 / Deck 切替 / Load More / 削除直後の DOM ref 更新。
- 画像ロードでカード高さが変わる場合の scroll 位置ずれ。
- detail modal / share dialog 表示中にボタンが残る事故。

## 10. バグリスク

主なリスク:

- ボタンを押しても意図したカードが中央に来ない。
- fixed 下部ボタンがカード操作や favorite button を邪魔する。
- Load More 後に次カード判定がずれる。
- 検索後に古い DOM ref を参照する。
- 画面回転後に scroll 位置がずれる。
- iOS Safari で address bar の伸縮により viewport 高が変わり、中央計算がずれる。

軽減策:

- DOM ref は callback ref で登録・解除する。
- scroll 実行直前に `getBoundingClientRect()` を取り直す。
- modal 表示中は button を出さない。
- `prefers-reduced-motion` の場合は `behavior: "auto"` にする。
- `layout === "rail"` では無効化する。

## 11. 実装する場合の最小ステップ

1. `mobileShutterSettings.ts` を追加する。
   - localStorage key と enabled 判定を置く。
2. `useMobileCardShutterNavigation.ts` を追加する。
   - item registration。
   - next target 計算。
   - scroll 実行。
3. `MobileCardShutterButton.tsx` を追加する。
   - mobile fixed button。
   - disabled state。
4. `TradingCardGrid` に接続する。
   - `layout === "grid"` のみ。
   - `displayCards` の ID を hook に渡す。
   - card wrapper に callback ref を渡す。
5. detail / edit / share modal 中は button を非表示にする。
6. mobile viewport で手動確認する。
   - All Cards。
   - Deck 絞り込み。
   - 検索結果。
   - favorite タブ。
   - Load More 後。
   - カード削除後。

## 12. 実装しない判断の基準

以下が見えた場合は実装しない、または削除する。

- 60 枚 Load More と通常スクロールで十分に快適。
- ボタンが画面の邪魔になる。
- スクロール位置が不安定で操作感が悪い。
- ユーザーが詳細モーダルを開く flow の方を好む。
- mobile Safari 固有のずれが多い。

この機能は Life Cards の中核ではない。必要性が薄ければ、専用 directory ごと削除できる状態を保つ。
