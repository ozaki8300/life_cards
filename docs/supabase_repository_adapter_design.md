# Supabase Repository Adapter Design

## 目的

Life Cards の UI と Reencounter Engine が保存先を直接知らない設計にする。

現在は localStorage Repository が直接使われているが、将来 Supabase sync を導入する時に UI の大きな作り替えを避けるため、localStorage 版と Supabase 版を Repository adapter で切り替えられる境界を決める。

今回の前提:

- Supabase SDK はまだ導入しない。
- Auth はまだ実装しない。
- 実DBには接続しない。
- Repository 実装はまだ作らない。
- UI は変更しない。
- Reencounter Engine は storage を直接知らない状態を維持する。

## 1. 現行 Repository の責務

### CardRepository

現在の配置:

```txt
src/lib/cardRepository.ts
```

主な責務:

- `life_cards.cards` を読む。
- seed cards と localStorage cards を切り替える。
- card を保存する。
- card を更新する。
- card を削除する。
- deck 削除時に cards を別 deck へ移動する。

現在の主な API:

```ts
getCards(seed)
saveCard(card)
updateCard(card)
deleteCard(cardId)
moveCardsToDeck(fromDeckId, toDeckId)
```

### DeckRepository

現在の配置:

```txt
src/lib/deckRepository.ts
```

主な責務:

- `life_cards.decks` を読む。
- seed decks と localStorage decks を切り替える。
- deck を保存する。
- deck を削除する。
- deck の並び順を保存する。

現在の主な API:

```ts
getDecks(seed)
saveDeck(deck)
deleteDeck(deckId)
reorderDecks(nextDecks)
```

### EncounterRepository

現在の配置:

```txt
src/lib/encounterRepository.ts
```

主な責務:

- `life_cards.encounters` を読む。
- `Record<cardId, EncounterMetadata>` として保持する。
- detail open 時の view を記録する。
- 今日の再会経由の reencounter を記録する。
- card 削除時に metadata を削除する。

現在の主な API:

```ts
getMetadataMap()
getMetadata(cardId)
recordView(cardId, viewedAt)
recordReencounter(cardId, viewedAt)
deleteMetadata(cardId)
```

## 2. 現行 UI / Domain の接続

`CardHome` は現在、以下を行う orchestrator になっている。

- `CardRepository.getCards()` を読む。
- `DeckRepository.getDecks()` を読む。
- `EncounterRepository.getMetadataMap()` を読む。
- favorite 更新時に `CardRepository.updateCard()` を呼ぶ。
- card 削除時に `CardRepository.deleteCard()` と `EncounterRepository.deleteMetadata()` を呼ぶ。
- view / reencounter 記録時に `EncounterRepository.recordView()` / `recordReencounter()` を呼ぶ。
- `ReencounterEngine.pick()` に cards / favoriteIds / metadata を渡す。

重要な境界:

- `ReencounterEngine` は Repository / localStorage / Supabase を import しない。
- `CardFace`, `CardTile`, `CardDetailModal`, `TradingCardGrid` は保存先を知らない。
- 保存先を知る責務は Repository / adapter と上位 orchestrator に閉じる。

## 3. Supabase Repository 案

将来追加する候補:

```txt
src/lib/supabase/cardSupabaseRepository.ts
src/lib/supabase/deckSupabaseRepository.ts
src/lib/supabase/encounterSupabaseRepository.ts
```

または repository interface を切る場合:

```txt
src/lib/repositories/cardRepositoryTypes.ts
src/lib/repositories/cardLocalRepository.ts
src/lib/repositories/cardSupabaseRepository.ts
```

初期は大規模移動を避け、既存 `src/lib/*Repository.ts` を localStorage 実装として残し、Supabase 実装を並列に追加する方が安全。

### CardSupabaseRepository

想定責務:

- Supabase `cards` table を読む。
- Supabase rows を現行 `Card` 型へ map する。
- 現行 `Card` 型を Supabase row へ map する。
- card を upsert / update / delete する。
- 初期削除方針として card を物理削除する。
- 物理削除時、`encounters` は FK cascade に任せる。

想定 API:

```ts
getCards(userId): Promise<Card[]>
upsertCard(userId, card): Promise<Card>
updateCard(userId, card): Promise<Card>
deleteCard(userId, cardId): Promise<void>
moveCardsToDeck(userId, fromDeckId, toDeckId): Promise<Card[]>
```

### DeckSupabaseRepository

想定責務:

- Supabase `decks` table を読む。
- Supabase rows を現行 `Deck` 型へ map する。
- 現行 `Deck` 型を Supabase row へ map する。
- deck を upsert / delete / reorder する。
- `uncategorized` deck を user ごとに必ず用意する。

想定 API:

```ts
getDecks(userId): Promise<Deck[]>
upsertDeck(userId, deck): Promise<Deck>
deleteDeck(userId, deckId): Promise<void>
reorderDecks(userId, decks): Promise<Deck[]>
ensureUncategorizedDeck(userId): Promise<Deck>
```

### EncounterSupabaseRepository

想定責務:

- Supabase `encounters` table を読む。
- rows を `Record<cardId, EncounterMetadata>` に map する。
- view / reencounter を upsert する。
- card 物理削除時は基本的に FK cascade に任せる。

想定 API:

```ts
getMetadataMap(userId): Promise<Record<string, EncounterMetadata>>
getMetadata(userId, cardId): Promise<EncounterMetadata | undefined>
recordView(userId, cardId, viewedAt): Promise<EncounterMetadata>
recordReencounter(userId, cardId, viewedAt): Promise<EncounterMetadata>
deleteMetadata(userId, cardId): Promise<void>
```

## 4. Repository Adapter / Interface 案

UI からは保存先を直接選ばせず、上位で repository set を注入できる形にする。

候補:

```ts
type LifeCardsRepositorySet = {
  cards: CardRepositoryLike;
  decks: DeckRepositoryLike;
  encounters: EncounterRepositoryLike;
};
```

最小 interface 案:

```ts
type CardRepositoryLike = {
  getCards(): Promise<Card[]> | Card[];
  saveCard(card: Card): Promise<Card[] | Card> | Card[];
  updateCard(card: Card): Promise<Card[] | Card> | Card[];
  deleteCard(cardId: string): Promise<Card[] | void> | Card[];
  moveCardsToDeck(fromDeckId: string, toDeckId: string): Promise<Card[]> | Card[];
};

type DeckRepositoryLike = {
  getDecks(): Promise<Deck[]> | Deck[];
  saveDeck(deck: Deck): Promise<Deck[] | Deck> | Deck[];
  deleteDeck(deckId: string): Promise<Deck[] | void> | Deck[];
  reorderDecks(nextDecks: Deck[]): Promise<Deck[]> | Deck[];
};

type EncounterRepositoryLike = {
  getMetadataMap(): Promise<Record<string, EncounterMetadata>> | Record<string, EncounterMetadata>;
  recordView(cardId: string, viewedAt: string): Promise<EncounterMetadata> | EncounterMetadata;
  recordReencounter(cardId: string, viewedAt: string): Promise<EncounterMetadata> | EncounterMetadata;
  deleteMetadata(cardId: string): Promise<Record<string, EncounterMetadata> | void> | Record<string, EncounterMetadata>;
};
```

注意:

- 現行 localStorage Repository は同期 API。
- Supabase Repository は非同期 API。
- `CardHome` 側は Supabase 導入時に async load / mutation を扱う必要がある。
- いきなり全 UI に async を広げず、Repository adapter と `CardHome` orchestration で吸収する。

## 5. Adapter Mapping

### Supabase cards row -> Card

```ts
{
  id: row.id,
  deckId: row.deck_id,
  frontText: row.front_text ?? "",
  frontComment: row.front_comment ?? "",
  backText: row.back_text ?? "",
  imagePath: row.image_path ?? "",
  isFavorite: row.is_favorite,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
}
```

### Card -> Supabase cards row

```ts
{
  id: card.id,
  user_id: userId,
  deck_id: card.deckId,
  front_text: card.frontText ?? "",
  front_comment: card.frontComment ?? "",
  back_text: card.backText ?? "",
  image_path: card.imagePath ?? null,
  is_favorite: Boolean(card.isFavorite),
  created_at: card.createdAt,
  updated_at: card.updatedAt,
}
```

### Supabase decks row -> Deck

```ts
{
  id: row.id,
  name: row.name,
  cardCount: computedCardCount,
  isShared: row.is_shared,
  createdAt: row.created_at,
}
```

### Deck -> Supabase decks row

```ts
{
  id: deck.id,
  user_id: userId,
  name: deck.name,
  sort_order: index,
  is_shared: Boolean(deck.isShared),
  created_at: deck.createdAt,
  updated_at: now,
}
```

### Supabase encounters row -> EncounterMetadata

```ts
{
  cardId: row.card_id,
  firstViewedAt: row.first_viewed_at ?? undefined,
  lastViewedAt: row.last_viewed_at ?? undefined,
  viewCount: row.view_count,
  lastReencounterAt: row.last_reencounter_at ?? undefined,
  nextReencounterAt: row.next_reencounter_at ?? undefined,
}
```

### EncounterMetadata -> Supabase encounters row

```ts
{
  user_id: userId,
  card_id: metadata.cardId,
  first_viewed_at: metadata.firstViewedAt ?? null,
  last_viewed_at: metadata.lastViewedAt ?? null,
  view_count: metadata.viewCount,
  last_reencounter_at: metadata.lastReencounterAt ?? null,
  next_reencounter_at: metadata.nextReencounterAt ?? null,
  updated_at: now,
}
```

## 6. Migration 順序

Supabase SQL 設計に合わせ、migration / 初回 sync は必ず以下の順に行う。

1. `uncategorized` deck を user ごとに upsert する。
2. localStorage の `life_cards.decks` を読む。
3. `decks` を `(user_id, id)` で upsert する。
4. localStorage の `life_cards.cards` を読む。
5. `cards` を `(user_id, id)` で upsert する。
6. localStorage の `life_cards.encounters` を読む。
7. `encounters` を `(user_id, card_id)` で upsert する。
8. Supabase から読み直し、現行 app 型へ adapter で変換する。

理由:

- `cards` は `(user_id, deck_id)` で `decks` を参照する。
- `encounters` は `(user_id, card_id)` で `cards` を参照する。
- deck が先にないと card upsert が foreign key で失敗する。
- card が先にないと encounter upsert が foreign key で失敗する。

## 7. 削除方針

初期方針:

- card 削除はまず物理削除。
- `encounters` は FK cascade で削除。
- localStorage 版では `EncounterRepository.deleteMetadata(cardId)` で明示 cleanup。
- Supabase 版では `cards` 物理削除により `encounters` cleanup を DB に任せる。
- Storage object cleanup は後続検討。

未分類 Deck の扱い:

- deck 削除時、card 自体は削除しない。
- 対象 deck の cards は `deck_id = 'uncategorized'` へ移動する。
- `uncategorized` deck は migration 前 / ログイン後に必ず upsert する。

将来 soft delete を採用する場合:

- `cards.deleted_at` を使う。
- query は `deleted_at is null` を基本にする。
- `encounters` を残すか cleanup するか再設計する。
- active card 用 partial index を検討する。

## 8. 画像方針

初期 Supabase sync は text-only sync として境界を切る。

選択肢:

1. `imagePath` data URL をそのまま `cards.image_path` に入れる。
2. 初期 Supabase sync では data URL 画像を同期対象外にする。
3. Storage upload 実装まで画像同期を保留する。

推奨:

- 初期は text-only sync を優先する。
- `frontText`, `frontComment`, `backText`, deck 所属, favorite, encounters を同期対象にする。
- `imagePath` data URL は localStorage backup に残す。
- Storage 同期は後続フェーズで、圧縮済み WebP Blob を `card-images` bucket に upload する。

理由:

- Database に base64 data URL を入れると肥大化しやすい。
- Supabase Storage RLS / signed URL / cleanup 方針を別途確定する必要がある。
- まず PC / スマホ間でカード本文と再会履歴が同期できることを優先する。

Storage 移行時の方針:

- localStorage の `imagePath` が data URL の場合、Blob に戻して Storage へ upload する。
- upload path は `users/{userId}/cards/{cardId}/front.webp` を基本にする。
- upload 後、`cards.image_path` には Storage path を保存する。
- 表示時は Storage path を signed URL などに解決し、現行 `Card.imagePath` に map する。

## 9. CardHome への接続方針

Supabase 導入時も、最初に触る UI はできるだけ `CardHome` に留める。

方針:

- `CardHome` は repository set を使って cards / decks / encounters を読む。
- `CardHome` は ReencounterEngine に storage 済みの metadata を渡す。
- `ReencounterSection`, `TradingCardGrid`, `CardTile`, `CardFace`, `CardDetailModal` は保存先を知らないままにする。
- Supabase 版では async load / loading / error を `CardHome` またはその上の provider で吸収する。

将来候補:

```txt
src/lib/repositories/lifeCardsRepository.ts
src/lib/repositories/localLifeCardsRepository.ts
src/lib/repositories/supabaseLifeCardsRepository.ts
```

または Auth 導入後:

```txt
src/components/LifeCardsRepositoryProvider.tsx
```

## 10. 今回やらないこと

この document では adapter 方針だけを決める。今回は以下を実装しない。

- Supabase SDK 導入。
- Auth 実装。
- Repository 実装。
- Repository interface 実装。
- UI 変更。
- Storage upload。
- localStorage migration 実装。
- SQL 適用。
- migration file 作成。
- package.json 変更。

## 11. 実装前に決めること

- adapter / mapper 関数を `src/lib/supabase` に置くか、`src/lib/repositories` に置くか。
- localStorage 版 Repository を既存ファイルのまま残すか、`LocalRepository` として rename するか。
- `CardHome` に repository set を props / context / module import のどれで渡すか。
- Supabase primary / localStorage backup の切り替えタイミング。
- text-only sync 中に画像あり card をどう表示するか。
- data URL 画像を Storage に移す migration をいつ行うか。
- Storage object cleanup を card 削除と同時に行うか、後続 cleanup job にするか。
- `profiles` を初期から作るか、まず Auth のみで始めるか。
