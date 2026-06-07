import type { Card, Deck } from "@/lib/types";
import { ReencounterEngine } from "@/domain/reencounter/engine";

export function keywordsFor(query: string) {
  return query
    .trim()
    .split(/[\s　]+/)
    .filter(Boolean)
    .map((keyword) => keyword.toLowerCase());
}

export function cardSearchText(card: Card, decks: Deck[]) {
  const deckName = decks.find((deck) => deck.id === card.deckId)?.name ?? "";

  return [
    card.frontText,
    card.frontComment,
    card.backText,
    deckName,
    card.createdAt,
    card.updatedAt,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function sortCardsByNewest(cards: Card[]) {
  return cards
    .map((card, index) => ({ card, index }))
    .sort((a, b) => {
      const dateCompare = b.card.createdAt.localeCompare(a.card.createdAt);

      return dateCompare === 0 ? b.index - a.index : dateCompare;
    })
    .map(({ card }) => card);
}

export function pickReencounterCards(cards: Card[], favoriteIds: Set<string>) {
  return ReencounterEngine.pick({ cards, favoriteIds });
}
