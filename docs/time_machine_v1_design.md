# Time Machine v1 Design

## 目的

Time Machine v1 は、Life Cards に「過去の自分と再会する」時間軸の体験を追加するための設計である。

Reencounter Engine が「今日の再会」としてカード単位で意味がありそうな 4 枚を選ぶのに対し、Time Machine は「この日、この時期、自分は何を作っていたか」を起点にカードを再提示する。

v1 の目的:

- 1年前、半年前、30日前など、時間の距離を手がかりにカードを見返す。
- 「過去の同じ季節」「この週に作ったカード」のように、日付のまとまりで記憶を掘り起こす。
- Reencounter Engine と混ぜすぎず、時間軸ビューとして軽く始める。
- 既存の `Card.createdAt` / `Card.updatedAt` を優先し、Card 型変更や DB migration なしで実現する。
- 通常一覧、詳細、マトリクスの既存 UX を壊さない。

## Reencounter Engine との違い

Reencounter Engine は、カードごとの閲覧履歴やお気に入り、Deck 偏り、random を使い、「今日見るとよさそうなカード」を選ぶ。目的は personalized な再提示であり、`EncounterMetadata` を scoring の材料にする。

Time Machine は、ユーザーの行動履歴よりも「カードが作られた日付」を主役にする。目的は timeline recall であり、最初の v1 では `createdAt` を中心にした deterministic なカード集合を返す。

| 観点 | Reencounter Engine | Time Machine v1 |
| --- | --- | --- |
| 主な単位 | カード単位の再会 | 日付・期間単位の再会 |
| 主な材料 | `EncounterMetadata`, favorite, random, deck diversity | `Card.createdAt`, 必要なら `updatedAt` |
| 体験 | 今日の 4 枚 | 過去の日付・季節の束 |
| 選び方 | score + diversity | date window matching + simple ordering |
| 理由 | なぜこのカードが出たか | いつのカードか |
| storage | metadata を読むが直接保存しない | v1 は追加 storage なし |

Time Machine は Reencounter Engine の代替ではない。ホーム上に置く場合も、「今日の再会」とは別セクションまたは別タブとして扱い、同じ候補生成ロジックへ無理に統合しない。

## v1 で出すカード条件

v1 は `createdAt` ベースで始める。カードの「記録された日」を時間軸の基準にすることで、Card 型変更なしに実装できる。

### 基本候補

以下の bucket を候補にする。

| Bucket | 条件案 | 表示ラベル案 |
| --- | --- | --- |
| 1年前の今日 | `createdAt` が today の 1 年前と同じ月日、または前後 3 日 | `1年前の今日` |
| 半年前の今日 | `createdAt` が today の約 6 か月前、または前後 3 日 | `半年前の今日` |
| 30日前のカード | `createdAt` が today の 30 日前、または前後 2 日 | `30日前のカード` |
| この週に作ったカード | 過去年の同じ ISO week、または今年の直近同週 | `この週に作ったカード` |
| 過去の同じ季節 | 過去年の同じ季節 window | `同じ季節のカード` |

日付が完全一致しないと候補が空になりやすいため、v1 では小さな window を持たせる。

推奨 window:

- `1年前の今日`: 前後 7 日まで拡張可。初期表示は前後 3 日。
- `半年前の今日`: 前後 7 日。
- `30日前のカード`: 前後 2 日。
- `この週に作ったカード`: 週単位。
- `過去の同じ季節`: 45 日程度の季節 window。

### 並び順

bucket 内の並び順はシンプルにする。

1. 対象日との差が小さいカード。
2. `createdAt` が新しいカード。
3. `updatedAt` が新しいカード。
4. 同点なら既存配列順を維持。

v1 では score を複雑にしない。Time Machine は「なぜ選ばれたか」が日付条件だけで説明できる方がよい。

### 件数

ホームに出す場合は、1 bucket あたり最大 4 枚を推奨する。

Time Machine 専用画面を作る場合は、bucket ごとに横 rail で最大 8-12 枚まで表示してもよい。ただし v1 の最小実装は、ホームまたはカード画面上部に 1 つの compact section を置く程度に留める。

## UI 表示案

v1 の UI は、既存のカード体験へ静かに差し込む。

### 案 A: ホームの compact section

「今日の再会」の下、または通常一覧の上に `Time Machine` セクションを置く。

構成:

- セクション見出し: `Time Machine`
- bucket ラベル: `1年前の今日`, `30日前のカード` など。
- 横 rail / carousel でカードを表示。
- 各カード下に小さく `2025-06-18` のような日付 caption を出す。

メリット:

- 既存の `TradingCardGrid` / rail 表示に近い。
- 通常一覧やマトリクスに影響しにくい。
- ReencounterSection と並ぶ体験として分かりやすい。

注意:

- 「今日の再会」と視覚的に競合しないよう、表示量は控えめにする。
- reason chip のような強い説明を増やしすぎない。

### 案 B: Time Machine 専用タブ

カード画面内に `Timeline` / `Time Machine` タブを追加し、bucket を縦に並べる。

メリット:

- ホームを重くしない。
- 複数 bucket を自然に扱える。
- 将来の年表表示へ拡張しやすい。

デメリット:

- navigation の設計が必要。
- v1 の最小 PR としてはやや大きい。

### v1 推奨

最初は案 A の compact section を推奨する。

理由:

- 体験を小さく検証できる。
- 既存の rail / carousel 表示を流用しやすい。
- 通常一覧、詳細、マトリクスを触らずに済む。

候補がない場合はセクションごと非表示にする。空状態の説明 UI は v1 では不要。

## 既存の Card.createdAt / updatedAt だけで実現できるか

v1 の中心体験は `Card.createdAt` だけで実現できる。

できること:

- 1年前の今日に作ったカードを出す。
- 半年前、30日前に作ったカードを出す。
- 同じ週、同じ季節に作ったカードを出す。
- 日付 caption を表示する。
- bucket ごとにカードをまとめる。

`updatedAt` は v1 では補助材料に留める。

使い方:

- 同じ対象日に複数カードがある時の並び順。
- `createdAt` 候補が少ない場合の fallback。
- 将来の `最近編集した過去カード` bucket。

v1 で `updatedAt` を主条件にしすぎると、「過去の自分」ではなく「最近手を入れたカード」になりやすい。Time Machine の主語を保つため、初期は `createdAt` 優先がよい。

## EncounterMetadata を使うべきか

v1 では必須にしない。

理由:

- Time Machine の起点は閲覧履歴ではなく作成日である。
- metadata missing の初期ユーザーでも動くべき。
- Reencounter Engine と責務を混ぜすぎない方が安全。
- DB 変更なし、Card 型変更なしで始められる。

ただし、将来の拡張では補助的に使える。

将来使える metadata:

- `lastViewedAt`: 最近見たばかりの Time Machine 候補を少し下げる。
- `viewCount`: あまり見ていない過去カードを優先する。
- `lastReencounterAt`: 今日の再会と同じカードが同日に重なりすぎないよう抑制する。

v1 の推奨:

- Time Machine picker は `cards`, `today`, `limit`, `options` だけで成立させる。
- `metadataByCardId` は optional にしてもよいが、最初の実装では使わない。
- `EncounterRepository` の保存処理は触らない。

## Engine / 型案

Time Machine は Reencounter Engine と別 module にする。

候補:

```txt
src/domain/timeMachine/types.ts
src/domain/timeMachine/engine.ts
```

型案:

```ts
export type TimeMachineBucketType =
  | "one_year_ago"
  | "six_months_ago"
  | "thirty_days_ago"
  | "same_week"
  | "same_season";

export type TimeMachinePickInput = {
  cards: Card[];
  today: string;
  limitPerBucket?: number;
};

export type TimeMachineCandidate = {
  card: Card;
  bucketType: TimeMachineBucketType;
  bucketLabel: string;
  matchedDate: string;
  daysFromTarget: number;
};

export type TimeMachineBucket = {
  type: TimeMachineBucketType;
  label: string;
  targetDate?: string;
  candidates: TimeMachineCandidate[];
};
```

Engine の責務:

- 日付 bucket を作る。
- `createdAt` が bucket window に入るカードを集める。
- bucket 内で並び替える。
- 空 bucket を除外する。
- UI に出せる label と candidate を返す。

Engine の責務外:

- localStorage / Supabase から直接読む。
- `EncounterMetadata` を保存する。
- detail open の記録を増やす。
- UI component を import する。
- Reencounter Engine の score を呼ぶ。

## v1 でやること / やらないこと

### v1 でやる

- `createdAt` ベースの Time Machine bucket 生成。
- 1年前、半年前、30日前、同じ週、同じ季節の候補抽出。
- 候補がない bucket は非表示。
- 1 bucket あたりの表示上限を設定。
- UI に短い bucket label と日付 caption を表示。
- Engine は pure logic に寄せる。
- 通常一覧、詳細、マトリクスの仕様を変えない。

### v1 でやらない

- AI 推薦。
- embedding。
- 外部 API。
- DB migration。
- Card 型変更。
- `EncounterMetadata` の新規項目追加。
- 複雑な学習モデル。
- Reencounter Engine との score 統合。
- 年表専用の大規模 UI。
- 通知や push reminder。
- カレンダー連携。

## 実装ステップ案

安全な順番:

1. 型定義を追加する。
   - `TimeMachineBucketType`
   - `TimeMachineCandidate`
   - `TimeMachineBucket`
   - input / options

2. 日付 utility を pure function として作る。
   - date part の正規化。
   - 日数差の計算。
   - month/day matching。
   - week / season window 判定。

3. `TimeMachineEngine.pick()` を実装する。
   - `cards`, `today`, `limitPerBucket` を受け取る。
   - bucket ごとに candidates を返す。
   - localStorage / Supabase は import しない。

4. focused test を追加する。
   - 1年前の今日が拾える。
   - 前後 window のカードが拾える。
   - 候補なし bucket が空で返る、または除外される。
   - limitPerBucket が効く。
   - `updatedAt` だけでは主候補にならない。

5. hook を追加する。
   - `useTimeMachineCards` のような hook で `cards` と `today` を渡す。
   - 保存処理は増やさない。

6. compact section を追加する。
   - `TimeMachineSection` を新設する。
   - 既存 rail 表示を使う場合も、通常一覧には props を漏らさない。
   - 候補がない場合は何も表示しない。

7. detail open の既存 flow を使う。
   - Time Machine 経由で開いても通常 detail open と同じ扱いにする。
   - `recordView` は既存の detail open flow に任せる。
   - `recordReencounter` は呼ばない。

8. 必要なら表示位置を調整する。
   - 今日の再会との距離。
   - mobile での表示量。
   - carousel indicator の有無。

## リスク

### 候補が空になりやすい

カード数が少ない初期状態では、1年前や半年前の候補が存在しない。

対策:

- bucket ごと非表示にする。
- window を前後数日に広げる。
- v1 では空状態 UI を増やしすぎない。

### 「過去の今日」が厳密すぎる

完全一致だけだと体験がほとんど発火しない。

対策:

- 1年前は前後 3-7 日。
- 同じ季節 bucket を fallback として用意する。

### 今日の再会とカードが重複する

Time Machine と Reencounter が同じカードを出す可能性がある。

対策:

- v1 では許容してよい。
- 気になる場合は UI 接続時に、今日の再会カード id を Time Machine 側で除外できる optional option を用意する。
- Engine 同士を直接依存させない。

### `updatedAt` が主語を曇らせる

最近編集した古いカードが「1年前の今日」より強く出ると、時間軸体験が分かりにくくなる。

対策:

- v1 は `createdAt` 優先。
- `updatedAt` は tie-breaker または別 bucket の将来拡張に留める。

### UI が重くなる

今日の再会、Time Machine、通常一覧が同時に並ぶとホームが騒がしくなる。

対策:

- 候補がある時だけ表示する。
- 1 bucket だけを compact に出す案から始める。
- 複数 bucket は専用タブへ逃がす。

### 日付形式の揺れ

`createdAt` が `YYYY-MM-DD` と ISO datetime で混在すると、日付比較がズレる。

対策:

- Engine 内で date part を取り出して比較する。
- timezone を UI 表示と揃える。
- invalid date は候補から除外する。

### Leap day / 月末

2月29日、月末、半年差の計算で target date が揺れる。

対策:

- 厳密な暦計算を utility に閉じ込める。
- v1 では window matching により自然に吸収する。

## 最小 PR 単位

推奨する最小 PR は以下。

1. Domain PR
   - `src/domain/timeMachine/*`
   - 型定義。
   - pure engine。
   - focused test。
   - UI 接続なし。

2. Hook 接続 PR
   - `useTimeMachineCards` 追加。
   - `CardHome` から cards を渡すだけ。
   - 表示はまだ feature flag または未使用でもよい。

3. Compact UI PR
   - `TimeMachineSection` 追加。
   - rail / carousel 表示。
   - bucket label と日付 caption。
   - 通常一覧、詳細、マトリクスには影響させない。

4. Polish PR
   - mobile spacing。
   - 表示 bucket の優先順位。
   - 今日の再会との重複抑制 option。

最初に実装へ進むなら、PR 1 の `Domain PR` だけを切るのが最も安全である。ここでは Reencounter Engine や保存処理に触れず、Time Machine の責務を pure logic として固定できる。
