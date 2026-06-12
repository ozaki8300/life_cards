"use client";

import { useCallback, useEffect, useState } from "react";

import type { Card } from "@/lib/types";

type TouchPoint = {
  x: number;
  y: number;
};

type Params = {
  cards: Card[];
  isEditing: boolean;
  isSharing: boolean;
  onCardViewed?: (cardId: string) => void;
  onPreviewModeReset: () => void;
};

export default function useCardSelectionNavigation({
  cards,
  isEditing,
  isSharing,
  onCardViewed,
  onPreviewModeReset,
}: Params) {
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [selectedCardSnapshot, setSelectedCardSnapshot] =
    useState<Card | null>(null);
  const [fallbackIndex, setFallbackIndex] = useState<number | null>(null);
  const [touchStartPoint, setTouchStartPoint] = useState<TouchPoint | null>(
    null,
  );
  const selectedCardIndex =
    selectedCardId === null
      ? -1
      : cards.findIndex((card) => card.id === selectedCardId);
  const selectedIndex =
    selectedCardIndex >= 0 ? selectedCardIndex : fallbackIndex;
  const selectedCard =
    selectedCardIndex >= 0
      ? cards[selectedCardIndex]
      : selectedCardSnapshot;
  const hasMultipleCards = cards.length > 1;

  const showCard = useCallback(
    (nextIndex: number) => {
      if (cards.length === 0) {
        return;
      }

      const boundedIndex = (nextIndex + cards.length) % cards.length;
      const nextCard = cards[boundedIndex];

      setSelectedCardId(nextCard.id);
      setSelectedCardSnapshot(nextCard);
      setFallbackIndex(boundedIndex);
      onPreviewModeReset();
      onCardViewed?.(nextCard.id);
    },
    [cards, onCardViewed, onPreviewModeReset],
  );

  const showPrevious = useCallback(() => {
    if (hasMultipleCards && selectedIndex !== null) {
      showCard(selectedIndex - 1);
    }
  }, [hasMultipleCards, selectedIndex, showCard]);

  const showNext = useCallback(() => {
    if (hasMultipleCards && selectedIndex !== null) {
      showCard(selectedIndex + 1);
    }
  }, [hasMultipleCards, selectedIndex, showCard]);

  const closePreview = useCallback(() => {
    setSelectedCardId(null);
    setSelectedCardSnapshot(null);
    setFallbackIndex(null);
    onPreviewModeReset();
  }, [onPreviewModeReset]);

  const handlePreviewBackdropClick = useCallback(() => {
    closePreview();
  }, [closePreview]);

  const openCard = useCallback(
    (index: number) => {
      const card = cards[index];

      if (!card) {
        return;
      }

      setSelectedCardId(card.id);
      setSelectedCardSnapshot(card);
      setFallbackIndex(index);
      onPreviewModeReset();
      onCardViewed?.(card.id);
    },
    [cards, onCardViewed, onPreviewModeReset],
  );

  const selectCardIndex = useCallback(
    (index: number) => {
      const card = cards[index];

      if (!card) {
        return;
      }

      setSelectedCardId(card.id);
      setSelectedCardSnapshot(card);
      setFallbackIndex(index);
      onPreviewModeReset();
      onCardViewed?.(card.id);
    },
    [cards, onCardViewed, onPreviewModeReset],
  );

  const handlePreviewTouchStart = useCallback((x: number, y: number) => {
    setTouchStartPoint({ x, y });
  }, []);

  const handlePreviewTouchEnd = useCallback(
    (touchEndX: number, touchEndY: number) => {
      if (touchStartPoint === null || isEditing || isSharing) {
        return;
      }

      const deltaX = touchEndX - touchStartPoint.x;
      const deltaY = touchEndY - touchStartPoint.y;
      const absDeltaX = Math.abs(deltaX);
      const absDeltaY = Math.abs(deltaY);

      if (absDeltaX < 50 || absDeltaX < absDeltaY * 1.25) {
        setTouchStartPoint(null);
        return;
      }

      if (deltaX < 0) {
        showNext();
      } else {
        showPrevious();
      }

      setTouchStartPoint(null);
    },
    [isEditing, isSharing, showNext, showPrevious, touchStartPoint],
  );

  useEffect(() => {
    if (selectedCard === null || selectedIndex === null) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (isEditing || isSharing) {
        return;
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        showPrevious();
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        showNext();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isEditing, isSharing, selectedCard, selectedIndex, showNext, showPrevious]);

  return {
    closePreview,
    handlePreviewBackdropClick,
    handlePreviewTouchEnd,
    handlePreviewTouchStart,
    hasMultipleCards,
    openCard,
    selectedCard,
    selectedIndex,
    selectCardIndex,
    showNext,
    showPrevious,
  };
}
