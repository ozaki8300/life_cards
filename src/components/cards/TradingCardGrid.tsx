"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { Card, Deck } from "@/lib/types";

import CardDetailModal from "./CardDetailModal";
import CardEditDialog from "./CardEditDialog";
import CardShareDialog from "./CardShareDialog";
import CardTile from "./CardTile";

type Props = {
  cards: Card[];
  decks?: Deck[];
  favoriteIds?: string[];
  layout?: "grid" | "rail";
  onCardViewed?: (cardId: string) => void;
  onDeleteCard?: (cardId: string) => void;
  onToggleFavorite?: (cardId: string) => void;
  showCarouselIndicator?: boolean;
};

const GRID_CLASS =
  "grid grid-cols-1 justify-items-center gap-5 sm:grid-cols-3 sm:justify-items-stretch lg:grid-cols-4";
const RAIL_OUTER_CLASS =
  "w-full overflow-x-auto overflow-y-hidden overscroll-x-contain pb-3 [contain:paint]";
const RAIL_INNER_CLASS =
  "flex min-w-full snap-x snap-mandatory flex-nowrap gap-4 sm:gap-5";
const RAIL_ITEM_CLASS =
  "w-[min(22rem,calc(100vw-2.5rem))] shrink-0 snap-start overflow-hidden rounded-[18px] [contain:paint] sm:w-[calc((100%-2.5rem)/3)] lg:w-[calc((100%-3.75rem)/4)] xl:w-[calc((100%-5rem)/5)]";

export default function TradingCardGrid({
  cards,
  decks = [],
  favoriteIds,
  layout = "grid",
  onCardViewed,
  onDeleteCard,
  onToggleFavorite,
  showCarouselIndicator = false,
}: Props) {
  const railRef = useRef<HTMLDivElement | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [flippedIds, setFlippedIds] = useState<Set<string>>(new Set());
  const [isEditing, setIsEditing] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [activeRailIndex, setActiveRailIndex] = useState(0);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [localFavoriteIds, setLocalFavoriteIds] = useState<Set<string>>(
    () =>
      new Set(
        cards.filter((card) => card.isFavorite).map((card) => card.id),
      ),
  );
  const activeFavoriteIds = favoriteIds
    ? new Set(favoriteIds)
    : localFavoriteIds;
  const selectedCard = selectedIndex === null ? null : cards[selectedIndex];
  const hasMultipleCards = cards.length > 1;
  const shouldShowCarouselIndicator =
    layout === "rail" && showCarouselIndicator && hasMultipleCards;

  const showCard = useCallback(
    (nextIndex: number) => {
      const boundedIndex = (nextIndex + cards.length) % cards.length;
      setSelectedIndex(boundedIndex);
      setIsEditing(false);
      setIsSharing(false);
      onCardViewed?.(cards[boundedIndex].id);
    },
    [cards, onCardViewed],
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
    setIsEditing(false);
    setIsSharing(false);
  }, []);

  const updateActiveRailIndex = useCallback(() => {
    const rail = railRef.current;
    const track = rail?.firstElementChild;

    if (!rail || !track) {
      return;
    }

    const railLeft = rail.getBoundingClientRect().left;
    const items = Array.from(track.children);
    let nextIndex = 0;
    let closestDistance = Number.POSITIVE_INFINITY;

    items.forEach((item, index) => {
      const distance = Math.abs(item.getBoundingClientRect().left - railLeft);

      if (distance < closestDistance) {
        closestDistance = distance;
        nextIndex = index;
      }
    });

    setActiveRailIndex(nextIndex);
  }, []);

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

  useEffect(() => {
    if (!shouldShowCarouselIndicator) {
      return;
    }

    const frame = window.requestAnimationFrame(updateActiveRailIndex);

    window.addEventListener("resize", updateActiveRailIndex);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", updateActiveRailIndex);
    };
  }, [cards.length, shouldShowCarouselIndicator, updateActiveRailIndex]);

  function scrollToRailIndex(index: number) {
    const rail = railRef.current;
    const track = rail?.firstElementChild;
    const item = track?.children[index] as HTMLElement | undefined;

    item?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "start",
    });
  }

  function toggleCard(cardId: string) {
    setFlippedIds((current) => {
      const next = new Set(current);

      if (next.has(cardId)) {
        next.delete(cardId);
      } else {
        next.add(cardId);
      }

      return next;
    });
  }

  function toggleFavorite(cardId: string) {
    if (onToggleFavorite) {
      onToggleFavorite(cardId);
      return;
    }

    setLocalFavoriteIds((current) => {
      const next = new Set(current);

      if (next.has(cardId)) {
        next.delete(cardId);
      } else {
        next.add(cardId);
      }

      return next;
    });
  }

  function openCard(index: number) {
    setSelectedIndex(index);
    onCardViewed?.(cards[index].id);
  }

  function deleteCard(card: Card) {
    if (window.confirm("このカードを削除しますか？")) {
      onDeleteCard?.(card.id);
      closePreview();
    }
  }

  function handleTouchEnd(touchEndX: number) {
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
  }

  if (cards.length === 0) {
    return (
      <div className="rounded-[12px] border border-[#e8ddcb] bg-[#fffaf0] p-8 text-sm text-[#8d7f6e] shadow-lg shadow-[#d7cab8]">
        No cards yet.
      </div>
    );
  }

  const cardTiles = cards.map((card, index) => (
    <div
      key={card.id}
      className={`card-enter ${
        layout === "rail" ? RAIL_ITEM_CLASS : "w-full max-w-[22rem] sm:max-w-none"
      }`}
      style={{ animationDelay: `${Math.min(index * 45, 360)}ms` }}
    >
      <CardTile
        card={card}
        isBack={flippedIds.has(card.id)}
        isFavorite={activeFavoriteIds.has(card.id)}
        layout={layout}
        onFlip={() => toggleCard(card.id)}
        onOpen={() => openCard(index)}
        onToggleFavorite={() => toggleFavorite(card.id)}
      />
    </div>
  ));

  return (
    <>
      {layout === "rail" ? (
        <div>
          <div
            ref={railRef}
            className={RAIL_OUTER_CLASS}
            onScroll={shouldShowCarouselIndicator ? updateActiveRailIndex : undefined}
          >
            <div className={RAIL_INNER_CLASS}>{cardTiles}</div>
          </div>

          {shouldShowCarouselIndicator ? (
            <div
              className="mt-1 flex justify-center gap-1.5 sm:hidden"
              aria-label="今日の再会カードの位置"
            >
              {cards.map((card, index) => (
                <button
                  key={card.id}
                  type="button"
                  className={`h-1.5 rounded-full transition-all ${
                    index === activeRailIndex
                      ? "w-4 bg-[#5f513f]"
                      : "w-1.5 bg-[#d8c8aa]"
                  }`}
                  aria-label={`${index + 1}枚目のカードへ移動`}
                  aria-current={index === activeRailIndex ? "true" : undefined}
                  onClick={() => scrollToRailIndex(index)}
                />
              ))}
            </div>
          ) : null}
        </div>
      ) : (
        <div className={GRID_CLASS}>{cardTiles}</div>
      )}

      {selectedCard && selectedIndex !== null ? (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-[#3b3126]/45 px-4 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] pt-5 backdrop-blur-md sm:px-6 sm:py-6"
          onTouchStart={(event) => setTouchStartX(event.changedTouches[0].clientX)}
          onTouchEnd={(event) => handleTouchEnd(event.changedTouches[0].clientX)}
        >
          <button
            type="button"
            aria-label="Close card preview"
            className="fixed inset-0 z-0 cursor-default"
            onClick={closePreview}
          />

          <div className="relative z-10 mx-auto flex min-h-full max-w-6xl items-center">
            <div className="relative w-full">
              {isEditing ? (
                <CardEditDialog
                  card={selectedCard}
                  decks={decks}
                  onClose={() => setIsEditing(false)}
                />
              ) : (
                <CardDetailModal
                  card={selectedCard}
                  index={selectedIndex}
                  isFavorite={activeFavoriteIds.has(selectedCard.id)}
                  hasMultipleCards={hasMultipleCards}
                  onClose={closePreview}
                  onDelete={() => deleteCard(selectedCard)}
                  onEdit={() => setIsEditing(true)}
                  onNext={showNext}
                  onPrevious={showPrevious}
                  onShare={() => setIsSharing(true)}
                  onToggleFavorite={() => toggleFavorite(selectedCard.id)}
                />
              )}
            </div>
          </div>

          {isSharing ? (
            <CardShareDialog
              card={selectedCard}
              index={selectedIndex}
              onClose={() => setIsSharing(false)}
            />
          ) : null}
        </div>
      ) : null}
    </>
  );
}
