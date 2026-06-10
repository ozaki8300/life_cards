"use client";

import { useCallback, useEffect, useState } from "react";

import type { Card } from "@/lib/types";

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
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const selectedCard =
    selectedIndex === null ? null : cards[selectedIndex] ?? null;
  const hasMultipleCards = cards.length > 1;

  const showCard = useCallback(
    (nextIndex: number) => {
      const boundedIndex = (nextIndex + cards.length) % cards.length;

      setSelectedIndex(boundedIndex);
      onPreviewModeReset();
      onCardViewed?.(cards[boundedIndex].id);
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
    setSelectedIndex(null);
    onPreviewModeReset();
  }, [onPreviewModeReset]);

  const handlePreviewBackdropClick = useCallback(() => {
    closePreview();
  }, [closePreview]);

  const openCard = useCallback(
    (index: number) => {
      setSelectedIndex(index);
      onPreviewModeReset();
      onCardViewed?.(cards[index].id);
    },
    [cards, onCardViewed, onPreviewModeReset],
  );

  const selectCardIndex = useCallback(
    (index: number) => {
      setSelectedIndex(index);
      onPreviewModeReset();
      onCardViewed?.(cards[index].id);
    },
    [cards, onCardViewed, onPreviewModeReset],
  );

  const handlePreviewTouchStart = useCallback((touchStartXValue: number) => {
    setTouchStartX(touchStartXValue);
  }, []);

  const handlePreviewTouchEnd = useCallback(
    (touchEndX: number) => {
      if (touchStartX === null || isEditing || isSharing) {
        return;
      }

      const deltaX = touchEndX - touchStartX;

      if (Math.abs(deltaX) < 50) {
        setTouchStartX(null);
        return;
      }

      if (deltaX < 0) {
        showNext();
      } else {
        showPrevious();
      }

      setTouchStartX(null);
    },
    [isEditing, isSharing, showNext, showPrevious, touchStartX],
  );

  useEffect(() => {
    if (selectedIndex === null) {
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
  }, [isEditing, isSharing, selectedIndex, showNext, showPrevious]);

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
