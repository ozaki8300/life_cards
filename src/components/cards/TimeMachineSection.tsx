"use client";

import { useMemo } from "react";

import type { TimeMachineBucket } from "@/domain/timeMachine/types";
import type { Card, Deck } from "@/lib/types";

import TradingCardGrid from "./TradingCardGrid";

type Props = {
  buckets: TimeMachineBucket[];
  decks: Deck[];
  editSeedCards?: Card[];
  favoriteIds: string[];
  onCardViewed?: (cardId: string) => void;
  onDecksChange?: (decks: Deck[]) => void;
  onDeleteCard?: (cardId: string) => void;
  onUpdateCard?: (card: Card) => void;
  onToggleFavorite: (cardId: string) => void;
};

export default function TimeMachineSection({
  buckets,
  decks,
  editSeedCards,
  favoriteIds,
  onCardViewed,
  onDecksChange,
  onDeleteCard,
  onUpdateCard,
  onToggleFavorite,
}: Props) {
  const bucket = buckets[0];
  const displayCandidates = useMemo(() => {
    if (!bucket) {
      return [];
    }

    if (!editSeedCards) {
      return bucket.candidates;
    }

    const latestCardsById = new Map(editSeedCards.map((card) => [card.id, card]));

    return bucket.candidates.map((candidate) => ({
      ...candidate,
      card: latestCardsById.get(candidate.card.id) ?? candidate.card,
    }));
  }, [bucket, editSeedCards]);
  const displayCards = useMemo(
    () => displayCandidates.map((candidate) => candidate.card),
    [displayCandidates],
  );
  const dateCaptionByCardId = useMemo(
    () =>
      Object.fromEntries(
        displayCandidates.map((candidate) => [
          candidate.card.id,
          candidate.matchedDate,
        ]),
      ),
    [displayCandidates],
  );

  if (!bucket || displayCards.length === 0) {
    return null;
  }

  return (
    <section className="w-full">
      <div className="mb-3">
        <h2 className="text-lg font-semibold tracking-tight text-[#332d25] sm:text-xl">
          Time Machine
        </h2>
        <p className="mt-0.5 text-xs font-medium text-[#b2a491]">
          {bucket.label}
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
        railCaptionByCardId={dateCaptionByCardId}
        railLoop
        showCarouselIndicator
      />
    </section>
  );
}
