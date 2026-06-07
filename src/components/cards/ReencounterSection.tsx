"use client";

import type { Card, Deck } from "@/lib/types";

import TradingCardGrid from "./TradingCardGrid";

type Props = {
  title: string;
  subtitle: string;
  cards: Card[];
  decks: Deck[];
  favoriteIds: string[];
  onCardViewed?: (cardId: string) => void;
  onToggleFavorite: (cardId: string) => void;
};

export default function ReencounterSection({
  title,
  subtitle,
  cards,
  decks,
  favoriteIds,
  onCardViewed,
  onToggleFavorite,
}: Props) {
  if (cards.length === 0) {
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
        cards={cards}
        decks={decks}
        favoriteIds={favoriteIds}
        layout="rail"
        onCardViewed={onCardViewed}
        onToggleFavorite={onToggleFavorite}
      />
    </section>
  );
}
