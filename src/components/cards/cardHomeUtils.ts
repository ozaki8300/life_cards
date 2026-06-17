import type { Card, Deck } from "@/lib/types";
import type { EncounterMetadata } from "@/domain/reencounter/types";
import { ReencounterEngine } from "@/domain/reencounter/engine";

export function normalizeSearchText(value: string) {
  return value.normalize("NFKC").toLowerCase();
}

export function keywordsFor(query: string) {
  return query
    .trim()
    .split(/[\s　]+/)
    .filter(Boolean)
    .map(normalizeSearchText);
}

export function cardSearchText(card: Card, decks: Deck[]) {
  const deckName = decks.find((deck) => deck.id === card.deckId)?.name ?? "";
  const searchText = [
    card.frontText,
    card.frontComment,
    card.backText,
    deckName,
    card.createdAt,
    card.updatedAt,
  ]
    .filter(Boolean)
    .join(" ");

  return normalizeSearchText(searchText);
}

export function sortCardsByRecent(cards: Card[]) {
  return cards
    .map((card, index) => ({ card, index }))
    .sort((a, b) => {
      const updatedAtCompare = (b.card.updatedAt || b.card.createdAt).localeCompare(
        a.card.updatedAt || a.card.createdAt,
      );

      if (updatedAtCompare !== 0) {
        return updatedAtCompare;
      }

      const createdAtCompare = b.card.createdAt.localeCompare(a.card.createdAt);

      return createdAtCompare === 0 ? a.index - b.index : createdAtCompare;
    })
    .map(({ card }) => card);
}

export function pickReencounterCards({
  cards,
  favoriteIds,
  limit,
  metadataByCardId,
  random,
  today,
}: {
  cards: Card[];
  favoriteIds: ReadonlySet<string>;
  limit?: number;
  metadataByCardId: Record<string, EncounterMetadata>;
  random?: () => number;
  today: string;
}) {
  return ReencounterEngine.pick(
    {
      cards,
      favoriteIds,
      metadataByCardId,
      today,
    },
    { limit, random },
  );
}
