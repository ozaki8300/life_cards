"use client";

import { useMemo } from "react";

import type { Card, Deck } from "@/lib/types";

import TradingCardGrid from "./TradingCardGrid";

const REENCOUNTER_DISPLAY_LIMIT = 4;

type Props = {
  title: string;
  subtitle: string;
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

export default function ReencounterSection({
  title,
  subtitle,
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
  const displayCards = useMemo(() => {
    const limitedCards = cards.slice(0, REENCOUNTER_DISPLAY_LIMIT);

    if (!editSeedCards) {
      return limitedCards;
    }

    const latestCardsById = new Map(editSeedCards.map((card) => [card.id, card]));

    return limitedCards.map((card) => latestCardsById.get(card.id) ?? card);
  }, [cards, editSeedCards]);

  if (displayCards.length === 0) {
    return null;
  }

  return (
    <section className="w-full">
      <div className="mb-3">
        <h2 className="text-lg font-semibold tracking-tight text-[#332d25] sm:text-xl">
          {title}
        </h2>
        <p className="mt-0.5 text-xs font-medium text-[#b2a491]">
          {subtitle}
        </p>
      </div>
      <TradingCardGrid
        cards={displayCards}
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
        showCarouselIndicator
      />
    </section>
  );
}
