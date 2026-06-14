"use client";

import { useMemo } from "react";

import type { ReencounterCandidate } from "@/domain/reencounter/types";
import type { Card, Deck } from "@/lib/types";

import TradingCardGrid from "./TradingCardGrid";

const REENCOUNTER_DISPLAY_LIMIT = 3;

type Props = {
  title: string;
  subtitle: string;
  candidates: ReencounterCandidate[];
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
  candidates,
  decks,
  editSeedCards,
  favoriteIds,
  onCardViewed,
  onDecksChange,
  onDeleteCard,
  onUpdateCard,
  onToggleFavorite,
}: Props) {
  const displayCandidates = useMemo(() => {
    const limitedCandidates = candidates.slice(0, REENCOUNTER_DISPLAY_LIMIT);

    if (!editSeedCards) {
      return limitedCandidates;
    }

    const latestCardsById = new Map(editSeedCards.map((card) => [card.id, card]));

    return limitedCandidates.map((candidate) => ({
      ...candidate,
      card: latestCardsById.get(candidate.card.id) ?? candidate.card,
    }));
  }, [candidates, editSeedCards]);
  const displayCards = useMemo(
    () => displayCandidates.map((candidate) => candidate.card),
    [displayCandidates],
  );

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
      <div className="mt-2 flex flex-wrap gap-2">
        {displayCandidates.map((candidate) => (
          <p
            key={candidate.card.id}
            className="rounded-full border border-[#e7dac8] bg-[#fffaf0]/64 px-2.5 py-1 text-[11px] font-semibold leading-tight text-[#8c7a62]"
          >
            {candidate.reason}
          </p>
        ))}
      </div>
    </section>
  );
}
