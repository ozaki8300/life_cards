# Reencounter Metadata Design

## 目的

Reencounter Engine で使う閲覧履歴や再会予定を、`Card` 型とは別の metadata として管理する。

今回の設計では、カードそのものは「保存された記憶の内容」を表し、再会履歴は「そのカードとユーザーがいつ再会したか」を表す別レイヤーとして扱う。

## 1. Card に `lastViewedAt` / `viewCount` を直接持たせない理由

`Card` は Life Cards の中核データであり、現在は以下のようなカード内容そのものを表している。

- 表面テキスト
- 表面コメント
- 裏面メモ
- 画像
- deck 所属
- favorite 状態
- created / updated

一方、`lastViewedAt` や `viewCount` はカード内容ではなく、ユーザーとカードの接触履歴である。

`Card` に直接持たせない理由:

- Card 型が「内容」と「利用履歴」の両方を背負って肥大化する。
- Reencounter Engine の実験で metadata 項目が増えた時、Card 保存構造まで揺れやすくなる。
- 将来、閲覧履歴をリセットしたい場合にカード本体を更新せずに済む。
- 再会ロジックの変更とカード編集 UX を分離できる。
- localStorage migration の影響範囲を metadata 側に閉じ込めやすい。
- 将来、端末別 / ユーザー別 / deck 別の再会履歴を扱う余地が残る。

基本方針:

- `Card` は記憶の内容。
- `EncounterMetadata` は再会の履歴と予定。
- Reencounter Engine は `Card[]` と `EncounterMetadata[]` を受け取り、表示候補を返す。

## 2. EncounterMetadata の責務

`EncounterMetadata` はカード本体を変更せずに、再会体験のための状態を保持する。

責務:

- 初めて閲覧された日時を記録する。
- 最後に閲覧された日時を記録する。
- 累計閲覧回数を記録する。
- 今日の再会枠から開かれた日時を記録する。
- 次に再会させたい日時を保持する。
- Reencounter Engine の scoring / scheduling に必要な材料を提供する。

責務外:

- カード本文の保存。
- deck 所属の管理。
- favorite 状態の管理。
- UI 表示文言の管理。
- CardRepository の代替。

## 3. localStorage key 候補

候補:

```txt
life_cards.encounters
```

理由:

- 既存の Life Cards storage key と名前空間を揃えやすい。
- `cards` / `decks` とは別に、再会履歴であることが分かる。
- 将来 IndexedDB や同期機構に移す場合も、責務境界を保ちやすい。

保存形式案:

```ts
Record<string, EncounterMetadata>
```

または:

```ts
EncounterMetadata[]
```

推奨は `Record<string, EncounterMetadata>`。

理由:

- `cardId` で直接引ける。
- detail open 時の更新が単純。
- card deletion / deck movement と疎結合にしやすい。

## 4. 型案

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

各項目の意味:

- `cardId`
  - 対象カードの id。
- `firstViewedAt`
  - 初めて詳細表示された日時。
- `lastViewedAt`
  - 最後に詳細表示された日時。
- `viewCount`
  - 詳細表示された累計回数。
- `lastReencounterAt`
  - 「今日の再会」など、Reencounter 経由で開かれた最後の日時。
- `nextReencounterAt`
  - 次に再会候補へ出す予定日時。

日時形式:

- 既存の `createdAt` / `updatedAt` と同じ方針を優先する。
- 実装時はまず ISO date string で統一するのが安全。
- 日単位か時刻込みかは Engine の粒度に合わせて決める。

初期値案:

```ts
{
  cardId,
  firstViewedAt: now,
  lastViewedAt: now,
  viewCount: 1,
}
```

`lastReencounterAt` / `nextReencounterAt` は通常閲覧では必須にしない。

## 5. Repository 案

候補:

```txt
src/lib/encounterRepository.ts
```

または domain 寄せ:

```txt
src/domain/reencounter/encounterRepository.ts
```

現時点の推奨:

```txt
src/lib/encounterRepository.ts
```

理由:

- localStorage を扱う責務は既存 Repository 群と同じ層に置く方が分かりやすい。
- `domain/reencounter` は pure logic に寄せ、storage details を持ち込まない方がよい。
- 将来 storage 実装を差し替える時も、Engine を純粋に保てる。

Repository API 案:

```ts
export const EncounterRepository = {
  getMetadataMap(): Record<string, EncounterMetadata>,
  getMetadata(cardId: string): EncounterMetadata | undefined,
  upsertMetadata(metadata: EncounterMetadata): Record<string, EncounterMetadata>,
  recordView(cardId: string, viewedAt: string): EncounterMetadata,
  recordReencounter(cardId: string, viewedAt: string): EncounterMetadata,
};
```

注意:

- 初期実装では `recordView` と `recordReencounter` だけでもよい。
- CardRepository と同時更新する必要はない。
- 削除済み cardId の metadata cleanup は後回しでもよいが、設計上は `pruneMissingCards(cardIds)` を追加できる。

## 6. 更新タイミング案

### detail open 時

カード詳細を開いた時に `recordView(cardId, now)` を呼ぶ。

更新内容:

- `firstViewedAt` がなければ設定。
- `lastViewedAt` を更新。
- `viewCount` を +1。

メリット:

- ユーザーが実際にカードと再会したタイミングに近い。
- 一覧スクロールや hover では記録されないため、ノイズが少ない。

注意:

- 詳細モーダル内で前後送りした時も、新しい cardId に対して記録する。
- 同じカードを短時間に何度も開いた時の重複カウントを抑えるかは別途判断する。

### 今日の再会カードを開いた時

`ReencounterSection` から開かれた場合は、通常の `recordView` に加えて `recordReencounter` を呼ぶ。

更新内容:

- `lastViewedAt`
- `viewCount`
- `lastReencounterAt`
- 必要なら `nextReencounterAt`

メリット:

- 通常閲覧と「再会として見た」を区別できる。
- Engine が「再会済みカードをしばらく出さない」判断をしやすくなる。

注意:

- どの一覧から開いたかを UI が知る必要がある。
- `TradingCardGrid` に scoring logic を入れず、イベント種別だけを上位から渡す設計にする。

## 7. ReencounterEngine との接続案

Engine は storage を直接読まない。

推奨 input:

```ts
type ReencounterPickInput = {
  cards: Card[];
  favoriteIds: ReadonlySet<string>;
  metadataByCardId?: Record<string, EncounterMetadata>;
  today?: string;
};
```

推奨 output:

```ts
type ReencounterPickResult = {
  cards: Card[];
};
```

または将来:

```ts
type ReencounterCandidate = {
  card: Card;
  score: number;
  reason?: string;
};
```

初期接続の流れ:

1. `CardHome` が `CardRepository` から cards を読む。
2. `CardHome` が `EncounterRepository` から metadata を読む。
3. `CardHome` が `ReencounterEngine.pick({ cards, favoriteIds, metadataByCardId })` を呼ぶ。
4. `ReencounterSection` には選ばれた cards だけを渡す。

禁止したい接続:

- `ReencounterEngine` が localStorage を直接読む。
- `CardFace` / `CardTile` / `CardDetailModal` が score を計算する。
- `TradingCardGrid` が scheduling を判断する。

## 8. migration 方針

初期導入時:

- `life_cards.encounters` が存在しなければ空 map として扱う。
- 既存カードには metadata がなくてもよい。
- Engine は metadata missing を許容する。

既存カードの初期 metadata:

- 起動時に全カード分を自動生成しない。
- detail open 時に lazy create する。

理由:

- localStorage 書き込みを最小限にできる。
- 既存保存データに影響を与えにくい。
- metadata の意味が「実際に見た履歴」として保たれる。

将来 migration が必要になった場合:

- metadata 側に `schemaVersion` を持たせる案を検討する。
- ただし最初から過剰に入れず、必要になった時点で追加してよい。

削除済みカードの metadata:

- すぐには消さなくてもよい。
- card list と突き合わせる cleanup は後続で検討する。
- cleanup を入れる場合も CardRepository ではなく EncounterRepository 側に閉じる。

## 9. 今回は実装しないこと

今回の設計段階では以下を実装しない。

- `EncounterMetadata` 型の src 追加。
- `EncounterRepository` 実装。
- `life_cards.encounters` localStorage key の追加。
- `Card` 型への項目追加。
- `CardRepository` / `DeckRepository` の変更。
- UI からの閲覧記録イベント追加。
- `CardDetailModal` / `TradingCardGrid` のリファクタ。
- scoring algorithm の本実装。
- scheduling algorithm の本実装。
- metadata migration の実装。

## 最小実装に進む時の推奨順序

1. `EncounterMetadata` 型を追加する。
2. `EncounterRepository` を追加する。
3. `ReencounterEngine.pick` の input に metadata を optional で追加する。
4. 既存の favorite-first 挙動を維持したまま metadata missing を許容する。
5. detail open 時に `recordView` を呼ぶ。
6. 今日の再会経由だけ `recordReencounter` を呼ぶ。
7. score / schedule を少しずつ engine 内へ追加する。

この順序なら、Card 型と既存 localStorage 構造を守りながら、再会履歴だけを独立して育てられる。
