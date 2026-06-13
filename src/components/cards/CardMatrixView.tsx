"use client";

import { useMemo } from "react";

import type { Card, Deck } from "@/lib/types";

import TradingCardGrid from "./TradingCardGrid";

type Props = {
  cards: Card[];
  decks: Deck[];
  editSeedCards?: Card[];
  favoriteIds: string[];
  onCardViewed?: (cardId: string) => void;
  onDecksChange?: (decks: Deck[]) => void;
  onDeleteCard?: (cardId: string) => void;
  onUpdateCard?: (card: Card) => void;
  onToggleFavorite: (cardId: string) => void;
};

type DeckCardGroup = {
  cards: Card[];
  deckId: string;
  deckName: string;
};

function cardTime(card: Card) {
  return new Date(card.updatedAt || card.createdAt).getTime();
}

function deckLabelFor(deckId: string, decksById: Map<string, Deck>) {
  return (
    decksById.get(deckId)?.name ??
    (deckId === "uncategorized" ? "未分類" : "Deck")
  );
}

export default function CardMatrixView({
  cards,
  decks,
  editSeedCards,
  favoriteIds,
  onCardViewed,
  onDecksChange,
  onDeleteCard,
  onUpdateCard,
  onToggleFavorite,
}: Props) {
  const deckGroups = useMemo<DeckCardGroup[]>(() => {
    const decksById = new Map(decks.map((deck) => [deck.id, deck]));
    const cardsByDeckId = new Map<string, Card[]>();

    cards.forEach((card) => {
      const deckCards = cardsByDeckId.get(card.deckId) ?? [];

      deckCards.push(card);
      cardsByDeckId.set(card.deckId, deckCards);
    });

    return Array.from(cardsByDeckId.entries())
      .map(([deckId, deckCards]) => ({
        cards: [...deckCards].sort((left, right) => cardTime(right) - cardTime(left)),
        deckId,
        deckName: deckLabelFor(deckId, decksById),
      }))
      .sort((left, right) => left.deckName.localeCompare(right.deckName, "ja"));
  }, [cards, decks]);

  if (deckGroups.length === 0) {
    return null;
  }

  return (
    <div className="space-y-7">
      {deckGroups.map((group) => (
        <section key={group.deckId} className="min-w-0">
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <h2 className="min-w-0 truncate text-base font-semibold tracking-tight text-[#332d25] sm:text-lg">
              {group.deckName}
            </h2>
            <span className="shrink-0 text-xs font-semibold text-[#b2a491]">
              {group.cards.length} cards
            </span>
          </div>
          <TradingCardGrid
            cards={group.cards}
            decks={decks}
            editSeedCards={editSeedCards}
            favoriteIds={favoriteIds}
            layout="rail"
            onCardViewed={onCardViewed}
            onDecksChange={onDecksChange}
            onDeleteCard={onDeleteCard}
            onUpdateCard={onUpdateCard}
            onToggleFavorite={onToggleFavorite}
            railLoop
          />
        </section>
      ))}
    </div>
  );
}
