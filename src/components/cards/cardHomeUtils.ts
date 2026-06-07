import type { Card, Deck } from "@/lib/types";

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
  const picked: Card[] = [];
  const pickedIds = new Set<string>();

  // MVP: favorite cards first. Later this becomes lastViewedAt/reencounterScore/randomSeed.
  for (const card of cards) {
    if (favoriteIds.has(card.id) && picked.length < 5) {
      picked.push(card);
      pickedIds.add(card.id);
    }
  }

  for (const card of cards) {
    if (picked.length >= 5) {
      break;
    }

    if (!pickedIds.has(card.id)) {
      picked.push(card);
      pickedIds.add(card.id);
    }
  }

  return picked;
}
