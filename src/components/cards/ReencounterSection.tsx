"use client";

import { useMemo } from "react";

import type { ReencounterCandidate } from "@/domain/reencounter/types";
import type { Card, Deck } from "@/lib/types";

import { REENCOUNTER_DISPLAY_LIMIT } from "./reencounterConstants";
import TradingCardGrid from "./TradingCardGrid";

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
  const reasonByCardId = useMemo(
    () =>
      Object.fromEntries(
        displayCandidates.flatMap((candidate) => {
          const reason = candidate.reason.trim();

          return reason ? [[candidate.card.id, reason]] : [];
        }),
      ),
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
        reasonByCardId={reasonByCardId}
        showCarouselIndicator
      />
    </section>
  );
}
