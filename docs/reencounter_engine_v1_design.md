# Reencounter Engine v1 Design

## 目的

Reencounter Engine v1 は、Life Cards の「今日の再会」で未来の自分に意味がありそうなカードを 4 枚選ぶための pure logic として設計する。

現在の「今日の再会」は、`ReencounterSection` / `useReencounterCards` / `cardHomeUtils` / `src/domain/reencounter/*` を通って候補を表示している。v1 では既存 UI / UX を壊さず、選定理由を説明できる形で、単なるランダム表示から一段だけ育てる。

v1 の目的:

- 忘れた頃にカードと再会する。
- 重要カードだけでなく、偶然性も残す。
- 同じ Deck や同じカードに偏らない。
- なぜこのカードが出たのか、短い理由で説明できる。
- Card 本体ではなく `EncounterMetadata` を使って履歴を扱う。
- Engine は localStorage / Supabase を直接読まず、受け取った `cards` と `metadata` だけで候補を返す。

## 基本方針

`Card` は記憶の内容、`EncounterMetadata` はユーザーとカードの接触履歴として扱う。

Engine の責務:

- `Card[]` と `metadataByCardId` を受け取る。
- スコア計算と選定理由の生成を行う。
- 4 枚の候補を返す。
- metadata missing を許容する。
- 同一 Deck 偏りと最近出たカードの再登場を軽減する。

Engine の責務外:

- localStorage / Supabase から直接読む。
- Card 本体を書き換える。
- `EncounterMetadata` を保存する。
- UI の layout を決める。
- AI 推薦や embedding を使う。

## 4 枚の選定枠

v1 で目指す 4 枚の性格は以下。

| 枠 | 目的 | 主な材料 | 例の理由 |
| --- | --- | --- | --- |
| 久しぶりカード | 忘れた頃に再会する | `lastViewedAt`, `lastReencounterAt`, `nextReencounterAt` | `143日ぶりの再会` |
| お気に入りカード | ユーザーが大切にしたカードを時々戻す | `isFavorite`, `viewCount`, `lastReencounterAt` | `お気に入りカード` |
| 最近作成/更新したカード | 作った直後の意味が消えないうちに再訪する | `createdAt`, `updatedAt`, metadata missing | `最近作ったカード` |
| ランダム発見カード | 意外なカードとの出会いを残す | random, deck diversity | `ランダム発見カード` |

### 固定枠方式

固定枠方式は「4 枚のうち 1 枚は久しぶり、1 枚はお気に入り」のように slot を先に決める。

メリット:

- 挙動を説明しやすい。
- UI 文言と対応しやすい。
- 初期実装が読みやすい。

デメリット:

- 対象カードがない枠の扱いが難しい。
- お気に入りが少ない、metadata がない、Deck が少ないなどの初期状態で不自然になりやすい。
- 固定枠を守るために、総合的には弱い候補が選ばれることがある。

### スコア方式

スコア方式は全カードに複数要素の score を付け、上位候補から選ぶ。

メリット:

- カード数や metadata の有無に強い。
- 将来の重み調整がしやすい。
- 固定枠に入らないカードも自然に浮上できる。

デメリット:

- 4 枚の内訳が偏る可能性がある。
- 理由表示が score の内訳とズレると不透明になる。
- 重みの調整が雑だと、毎回同じカードが出る。

### v1 推奨

v1 は「スコア方式 + 軽い多様性制約」を推奨する。

固定枠は内部の `reasonType` として扱い、最終選定は score を基本にする。つまり「久しぶりカード枠を必ず 1 枚」ではなく、「久しぶり要素が強いカードは score が上がり、理由も久しぶりになる」という設計にする。

ただし 4 枚の体験として単調にならないよう、以下の制約を追加する。

- 同一 Deck は原則 2 枚まで。
- `lastReencounterAt` が近すぎるカードは強く減点する。
- 同点に近い場合は Deck diversity と random を優先する。
- 候補が少ない場合は制約を緩め、4 枚未満でも自然に返す。

## スコア要素

v1 の score は、複雑な学習モデルではなく、説明可能な加点・減点の合計にする。

### 最終閲覧からの日数

`metadata.lastViewedAt` から `today` までの日数。

役割:

- 日数が大きいほど「忘れた頃に再会」しやすくする。
- ただし長期未閲覧カードだけにならないよう上限を設ける。

案:

- `daysSinceLastViewed` を 0-120 程度で cap する。
- 30 日以上は十分強いが、365 日が常に勝つ設計にはしない。

### 最後に今日の再会に出た日

`metadata.lastReencounterAt` から `today` までの日数。

役割:

- 最近「今日の再会」に出たカードを抑制する。
- 同じカードが何日も連続で出ることを避ける。

案:

- 0-2 日以内: 強い減点。
- 3-6 日以内: 中程度の減点。
- 7 日以上: 減点なし。

### viewCount

`metadata.viewCount`。

役割:

- まだあまり見ていないカードを少し浮上させる。
- 見すぎたカードの連続出現を抑える。

案:

- 0 回: 加点。
- 1-2 回: 小加点。
- 10 回以上: 小減点。

### isFavorite

`Card.isFavorite` または既存の `favoriteIds`。

役割:

- 大切なカードを再会候補に入りやすくする。
- ただし毎回お気に入りだけにならないよう、強すぎる bonus は避ける。

案:

- お気に入り: 中加点。
- 最近再会済みのお気に入り: `lastReencounterAt` の減点を優先する。

### createdAt / updatedAt

カードの作成日・更新日。

役割:

- 最近作成/更新したカードを、記憶が新しいうちにもう一度出す。
- 編集したカードが一覧に埋もれないようにする。

案:

- 0-2 日以内に作成: 中加点。
- 0-3 日以内に更新: 小加点。
- 古いカードにはこの要素での減点はしない。

### deckId / 同じ Deck の偏り

`Card.deckId`。

役割:

- 今日の 4 枚が同じ Deck に固まることを避ける。
- Deck 単位で記憶の種類に幅を出す。

案:

- 候補選定時に、同一 Deck は原則 2 枚まで。
- 4 枚を満たせない場合は制約を緩める。
- score 計算後の selection phase で扱い、個別 card score には混ぜすぎない。

### 最近出たカードの抑制

`lastReencounterAt`。

役割:

- 「またこれか」を避ける。
- お気に入りカードが強すぎる時の安全弁にする。

案:

- v1 では `lastReencounterAt` のみで判断する。
- 「表示されたが開かなかった」カードまでは追跡しない。

### metadata がない新規カード

metadata missing は初期状態・新規カード・未閲覧カードとして自然に扱う。

方針:

- metadata がなくても候補から除外しない。
- `viewCount = 0` とみなす。
- `lastViewedAt` はなしとして扱い、未閲覧 bonus を与える。
- `lastReencounterAt` がないため再会抑制はかけない。
- 理由は `まだあまり見ていないカード` または `最近作ったカード` を優先する。

## EncounterMetadata v1

既存設計 `docs/reencounter_metadata_design.md` と現行 `src/domain/reencounter/types.ts` を踏まえ、v1 で必要な最小項目は以下。

```ts
export type EncounterMetadata = {
  cardId: string;
  firstViewedAt?: string;
  lastViewedAt?: string;
  viewCount: number;
  lastReencounterAt?: string;
  nextReencounterAt?: string;
};
```

各項目の役割:

| 項目 | v1 での用途 | 必須度 |
| --- | --- | --- |
| `cardId` | metadata と card の対応 | 必須 |
| `firstViewedAt` | 初回閲覧の記録。v1 score では補助 | 任意 |
| `lastViewedAt` | 久しぶり score | 任意 |
| `viewCount` | 未閲覧・低閲覧 bonus | 必須扱い。ただし missing 時は 0 |
| `lastReencounterAt` | 最近出たカードの抑制 | 任意 |
| `nextReencounterAt` | 将来の scheduling hook。v1 では軽く使うか保留 | 任意 |

v1 では DB migration しない。既存 localStorage / Supabase の保存構造を前提にし、metadata がないカードを許容する。

`nextReencounterAt` は v1 で強制しない。使う場合も「期限が来ているカードに小加点」程度に留め、保存仕様や migration を増やさない。

## Engine input / output 型案

v1 の Engine は pure logic として、以下の形を推奨する。

```ts
export type ReencounterReasonType =
  | "long_absence"
  | "favorite"
  | "recent_activity"
  | "low_view"
  | "deck_diversity"
  | "random_discovery";

export type ReencounterPickInput = {
  cards: Card[];
  favoriteIds: ReadonlySet<string>;
  metadataByCardId?: Record<string, EncounterMetadata>;
  today?: string;
};

export type ReencounterPickOptions = {
  limit?: number;
  random?: () => number;
};

export type ReencounterCandidate = {
  card: Card;
  score: number;
  reason: string;
  reasonLabel: string;
  reasonType: ReencounterReasonType;
};
```

`reason` と `reasonLabel` の使い分け:

- `reason`: UI にそのまま出せる短い文。
- `reasonLabel`: 分析・debug・将来の UI badge 用の短い分類名。
- `reasonType`: 実装で分岐できる安定 ID。

例:

```ts
{
  card,
  score: 82,
  reason: "143日ぶりの再会",
  reasonLabel: "久しぶり",
  reasonType: "long_absence",
}
```

## 選定アルゴリズム案

v1 の流れ:

1. 全カードを candidate に変換する。
2. metadata missing を補完値として扱う。
3. 各 candidate に base score と score breakdown を付ける。
4. 最も強い reasonType と UI reason を決める。
5. score 順に並べる。
6. 同一 Deck 最大 2 枚の制約をかけながら 4 枚選ぶ。
7. 4 枚に満たない場合は Deck 制約を緩めて補充する。
8. score が近い候補では random と元 index を tie-breaker に使う。

score の大まかな構成:

```txt
score =
  longAbsenceScore
  + favoriteScore
  + lowViewScore
  + recentActivityScore
  + dueScheduleScore
  + randomDiscoveryScore
  - recentReencounterPenalty
  - overViewedPenalty
```

v1 では exact weight を固定しすぎず、実装時に読みやすい定数として管理する。

初期 weight 案:

| 要素 | 方向 | 目安 |
| --- | --- | ---: |
| 30 日以上見ていない | 加点 | +30 |
| 7-29 日見ていない | 加点 | +10-25 |
| metadata missing / viewCount 0 | 加点 | +18 |
| viewCount 1-2 | 加点 | +8-12 |
| お気に入り | 加点 | +18 |
| 3 日以内に作成 | 加点 | +14 |
| 3 日以内に更新 | 加点 | +8 |
| `nextReencounterAt <= today` | 加点 | +10 |
| 今日再会済み | 減点 | -100 |
| 1-2 日以内に再会済み | 減点 | -45 |
| 3-6 日以内に再会済み | 減点 | -18 |
| viewCount 10 以上 | 減点 | -6 |
| random | 加点 | +0-8 |

## 再会理由表示

理由表示は短く、ReencounterSection 下部のチップ表示に収まる文にする。

推奨文言:

| reasonType | reason 例 | reasonLabel |
| --- | --- | --- |
| `long_absence` | `143日ぶりの再会` | `久しぶり` |
| `favorite` | `お気に入りカード` | `お気に入り` |
| `recent_activity` | `最近作ったカード` | `最近作成` |
| `recent_activity` | `最近更新したカード` | `最近更新` |
| `low_view` | `まだあまり見ていないカード` | `未再読` |
| `deck_diversity` | `最近見ていないDeckから選びました` | `Deck` |
| `random_discovery` | `ランダム発見カード` | `発見` |

理由選定の優先順位:

1. 強い長期未閲覧がある場合は `long_absence`。
2. metadata missing / viewCount が低い場合は `low_view`。
3. 作成・更新がかなり新しい場合は `recent_activity`。
4. favorite bonus が主因なら `favorite`。
5. Deck diversity で繰り上がった場合は `deck_diversity`。
6. それ以外で random が効いた場合は `random_discovery`。

UI 上の注意:

- 理由は 4 つ並んでもうるさくない長さにする。
- score の数値は v1 UI では出さない。
- reasonLabel / reasonType は将来 badge や analytics に使えるが、v1 では表示しなくてよい。

## v1 でやること

- 4 枚選定。
- reason / reasonLabel / reasonType の付与。
- metadata missing の許容。
- 同一 Deck 偏りの軽減。
- 最近出たカードの抑制。
- `lastViewedAt`, `viewCount`, `lastReencounterAt`, `createdAt`, `updatedAt`, `isFavorite`, `deckId` を使った説明可能な score。
- `ReencounterEngine` を storage 非依存の pure logic に保つ。

## v1 でやらないこと

- AI 推薦。
- embedding。
- 外部 API。
- Commons 連携。
- DB migration。
- 複雑な学習モデル。
- UI の大幅変更。
- Card 型への履歴項目追加。
- `TradingCardGrid` への選定 logic 追加。
- `CardFace` / `CardTile` での score 計算。
- 「表示されたが開かれなかった」カードの impression tracking。

## 実装ステップ案

実装する場合は、既存 UI を壊さないように小さく進める。

1. 型定義を拡張する。
   - `ReencounterReasonType`
   - `reasonLabel`
   - `reasonType`
   - 必要なら score breakdown の内部型

2. `EncounterRepository` の現状を確認する。
   - `recordView`
   - `recordReencounter`
   - localStorage / Supabase の双方で `lastReencounterAt` が更新されるか
   - metadata missing を空 map として扱えるか

3. Engine pure logic を実装する。
   - `calculateReencounterScore`
   - `reason` 生成
   - deck diversity selection
   - recent reencounter penalty
   - deterministic test 用 `random`

4. `useReencounterCards` に接続する。
   - `limit: 4` を維持する。
   - Engine の input は `cards`, `favoriteIds`, `metadataByCardId`, `today` に留める。

5. `ReencounterSection` の reason 表示を維持する。
   - 既存の `candidate.reason` チップをそのまま使う。
   - `reasonLabel` / `reasonType` はまだ UI に出さなくてよい。

6. detail open 時の `recordView` を確認する。
   - 通常一覧・詳細前後送りで記録されること。
   - 既存 UX が変わらないこと。

7. 今日の再会経由 open 時の `recordReencounter` を確認する。
   - 今日の再会から開いた場合のみ `lastReencounterAt` を更新する。
   - 通常一覧やマトリクスからの open と混ざらないこと。

8. focused tests を追加する。
   - metadata missing でも 4 枚選べる。
   - 最近再会済みカードが抑制される。
   - 同一 Deck が多すぎる場合に偏りが軽減される。
   - `random` 注入で結果を安定検証できる。

## リスクと対策

### 毎回同じお気に入りが出る

リスク:

- favorite bonus が強すぎると、同じカードが固定化する。

対策:

- `lastReencounterAt` の減点を favorite bonus より強くする。
- favorite は中加点に留める。
- 同一カードの連日再登場を避ける。

### 最近作ったカードばかり出る

リスク:

- 作成・更新 bonus が強すぎると、古い記憶との再会が弱くなる。

対策:

- recent activity bonus は短期間だけ有効にする。
- long absence score と random discovery を残す。
- `createdAt` / `updatedAt` は減点ではなく一時的な加点として扱う。

### metadata がないカードが多い初期状態

リスク:

- 全カードが未閲覧扱いになり、理由が単調になる。

対策:

- metadata missing では `createdAt`, `updatedAt`, favorite, random, deck diversity を併用する。
- reason は `まだあまり見ていないカード` と `最近作ったカード` に分散させる。
- 初回から metadata を一括生成しない。

### 長期未閲覧カードばかりになる

リスク:

- 古いカードが常に高 score になり、最近のカードや偶然性が消える。

対策:

- `daysSinceLastViewed` に cap を設ける。
- random discovery と recent activity の余地を残す。
- Deck diversity selection を最後にかける。

### 理由表示がうるさい

リスク:

- 4 枚分の理由チップが長くなり、UI が重く見える。

対策:

- reason は 20 字前後を目安にする。
- score や複数理由は表示しない。
- reasonLabel は UI に出さず、必要なら後続で badge 化する。

### localStorage / Supabase 同期差分

リスク:

- 端末間で `lastReencounterAt` や `viewCount` に差が出ると、候補が変わる。

対策:

- Engine は渡された metadata を正として扱う。
- Repository 層で同期差分を吸収する。
- v1 では完全一致を求めず、候補が多少変わることを許容する。

## 推奨最小 PR 単位

実装に進む場合の最小 PR は以下に分ける。

1. Engine 型と score logic PR
   - `ReencounterReasonType`, `reasonLabel`, `reasonType`
   - score 計算
   - deck diversity selection
   - pure unit tests
   - UI 接続は最小限

2. 今日の再会接続 PR
   - `useReencounterCards` から v1 Engine を利用
   - `limit: 4` 維持
   - `ReencounterSection` の既存 reason 表示で確認
   - 通常一覧・マトリクスには触らない

3. metadata 記録確認 PR
   - detail open の `recordView` 確認
   - 今日の再会経由の `recordReencounter` 確認
   - localStorage / Supabase repository の差分確認
   - 必要な focused tests

4. tuning PR
   - score weight の微調整
   - reason 文言の調整
   - 初期状態・カード数少数・Deck 偏りケースの改善

最初の PR は Engine pure logic に閉じるのが最も安全。UI と persistence を同時に触ると原因切り分けが難しくなるため、v1 は「選ぶ力」を先に固め、その後で記録更新と表示体験を接続する。
