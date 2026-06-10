"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { CardImageStorageRepository } from "@/lib/supabase/cardImageStorageRepository";
import type { Card, Deck } from "@/lib/types";

import CardDetailModal from "./CardDetailModal";
import CardEditDialog from "./CardEditDialog";
import CardShareDialog from "./CardShareDialog";
import CardTile from "./CardTile";

type Props = {
  cards: Card[];
  decks?: Deck[];
  editSeedCards?: Card[];
  favoriteIds?: string[];
  layout?: "grid" | "rail";
  onCardViewed?: (cardId: string) => void;
  onDecksChange?: (decks: Deck[]) => void;
  onDeleteCard?: (cardId: string) => void;
  onUpdateCard?: (card: Card) => void;
  onToggleFavorite?: (cardId: string) => void;
  showCarouselIndicator?: boolean;
};

type VisibleLimitState = {
  limit: number;
  signature: string;
};

type SignedImageUrlState = {
  signature: string;
  urlsByPath: Record<string, string>;
};

const GRID_CLASS =
  "grid grid-cols-1 justify-items-center gap-5 sm:grid-cols-3 sm:justify-items-stretch lg:grid-cols-4";
const RAIL_OUTER_CLASS =
  "w-full overflow-x-auto overflow-y-hidden overscroll-x-contain pb-3";
const RAIL_INNER_CLASS =
  "flex min-w-full snap-x snap-mandatory flex-nowrap gap-4 sm:gap-5";
const RAIL_ITEM_CLASS =
  "w-[min(22rem,calc(100vw-2.5rem))] shrink-0 snap-start overflow-hidden rounded-[18px] [contain:paint] sm:w-[calc((100%-2.5rem)/3)] lg:w-[calc((100%-3.75rem)/4)] xl:w-[calc((100%-5rem)/5)]";
const GRID_PAGE_SIZE = 60;

export default function TradingCardGrid({
  cards,
  decks = [],
  editSeedCards,
  favoriteIds,
  layout = "grid",
  onCardViewed,
  onDecksChange,
  onDeleteCard,
  onUpdateCard,
  onToggleFavorite,
  showCarouselIndicator = false,
}: Props) {
  const railRef = useRef<HTMLDivElement | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [flippedIds, setFlippedIds] = useState<Set<string>>(new Set());
  const [isEditing, setIsEditing] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [activeRailIndex, setActiveRailIndex] = useState(0);
  const [updatedCardsById, setUpdatedCardsById] = useState<Map<string, Card>>(
    new Map(),
  );
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [visibleLimitState, setVisibleLimitState] =
    useState<VisibleLimitState>({
      limit: GRID_PAGE_SIZE,
      signature: "",
    });
  const [signedImageUrlState, setSignedImageUrlState] =
    useState<SignedImageUrlState>({
      signature: "",
      urlsByPath: {},
    });
  const [localFavoriteIds, setLocalFavoriteIds] = useState<Set<string>>(
    () =>
      new Set(
        cards.filter((card) => card.isFavorite).map((card) => card.id),
      ),
  );
  const cardsSignature = useMemo(
    () => cards.map((card) => card.id).join("|"),
    [cards],
  );
  const shouldLimitCards = layout === "grid";
  const visibleLimit =
    visibleLimitState.signature === cardsSignature
      ? visibleLimitState.limit
      : GRID_PAGE_SIZE;
  const visibleCount = shouldLimitCards
    ? Math.min(visibleLimit, cards.length)
    : cards.length;
  const visibleSourceCards = useMemo(
    () => cards.slice(0, visibleCount),
    [cards, visibleCount],
  );
  const hasMoreCards = shouldLimitCards && visibleCount < cards.length;
  const activeFavoriteIds = favoriteIds
    ? new Set(favoriteIds)
    : localFavoriteIds;
  const rawDisplayCards = useMemo(
    () => visibleSourceCards.map((card) => updatedCardsById.get(card.id) ?? card),
    [updatedCardsById, visibleSourceCards],
  );
  const displayImageStoragePaths = useMemo(
    () =>
      Array.from(
        new Set(
          rawDisplayCards
            .map((card) => card.imageStoragePath?.trim() ?? "")
            .filter(Boolean),
        ),
      ),
    [rawDisplayCards],
  );
  const displayImageStorageSignature = displayImageStoragePaths.join("|");
  const displayCards = useMemo(
    () =>
      rawDisplayCards.map((card) => {
        const imageStoragePath = card.imageStoragePath?.trim();
        const signedImagePath = imageStoragePath
          ? signedImageUrlState.urlsByPath[imageStoragePath]
          : "";

        return imageStoragePath
          ? {
              ...card,
              imagePath: signedImagePath || card.imagePath,
            }
          : card;
      }),
    [rawDisplayCards, signedImageUrlState.urlsByPath],
  );
  const currentCardsForEdit = useMemo(
    () =>
      (editSeedCards ?? cards).map(
        (card) => updatedCardsById.get(card.id) ?? card,
      ),
    [cards, editSeedCards, updatedCardsById],
  );
  const selectedCard =
    selectedIndex === null ? null : displayCards[selectedIndex] ?? null;
  const hasMultipleCards = displayCards.length > 1;
  const fullscreenImageIndexes = displayCards
    .map((card, index) =>
      card.imagePath?.trim() || card.imageStoragePath?.trim() ? index : -1,
    )
    .filter((index) => index >= 0);
  const canGoNextFullscreenImage = fullscreenImageIndexes.length >= 2;
  const shouldShowCarouselIndicator =
    layout === "rail" && showCarouselIndicator && cards.length > 1;

  function deckLabelFor(card: Card) {
    return decks.find((deck) => deck.id === card.deckId)?.name ?? "Deck";
  }

  const showCard = useCallback(
    (nextIndex: number) => {
      const boundedIndex =
        (nextIndex + displayCards.length) % displayCards.length;
      setSelectedIndex(boundedIndex);
      setIsEditing(false);
      setIsSharing(false);
      onCardViewed?.(displayCards[boundedIndex].id);
    },
    [displayCards, onCardViewed],
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

  const handlePreviewBackdropClick = useCallback(() => {
    closePreview();
  }, [closePreview]);

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
    let isActive = true;

    async function resolveVisibleImageUrls() {
      const unresolvedPaths = displayImageStoragePaths.filter(
        (path) => !signedImageUrlState.urlsByPath[path],
      );

      if (unresolvedPaths.length === 0) {
        return;
      }

      const entries = await Promise.all(
        unresolvedPaths.map(async (path) => {
          try {
            return [
              path,
              (await CardImageStorageRepository.getCachedSignedImageUrl(path)) ?? "",
            ] as const;
          } catch (error) {
            console.warn("Life Cards card image signed URL failed", error);
            return [path, ""] as const;
          }
        }),
      );

      if (!isActive) {
        return;
      }

      setSignedImageUrlState((current) => ({
        signature: displayImageStorageSignature,
        urlsByPath: {
          ...current.urlsByPath,
          ...Object.fromEntries(entries.filter(([, signedUrl]) => signedUrl)),
        },
      }));
    }

    resolveVisibleImageUrls();

    return () => {
      isActive = false;
    };
  }, [
    displayImageStoragePaths,
    displayImageStorageSignature,
    signedImageUrlState.urlsByPath,
  ]);

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

    setActiveRailIndex(index);
    item?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "start",
    });
  }

  function scrollToAdjacentRailItem(direction: -1 | 1) {
    scrollToRailIndex(
      (activeRailIndex + direction + cards.length) % cards.length,
    );
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
    setIsEditing(false);
    setIsSharing(false);
    onCardViewed?.(displayCards[index].id);
  }

  async function imageUrlForFullscreen(card: Card) {
    const directImagePath = card.imagePath?.trim();

    if (directImagePath) {
      return directImagePath;
    }

    const imageStoragePath = card.imageStoragePath?.trim();

    if (!imageStoragePath) {
      return null;
    }

    const cachedSignedUrl = signedImageUrlState.urlsByPath[imageStoragePath];

    if (cachedSignedUrl) {
      return cachedSignedUrl;
    }

    const signedUrl =
      await CardImageStorageRepository.getCachedSignedImageUrl(imageStoragePath);

    if (signedUrl) {
      setSignedImageUrlState((current) => ({
        signature: displayImageStorageSignature,
        urlsByPath: {
          ...current.urlsByPath,
          [imageStoragePath]: signedUrl,
        },
      }));
    }

    return signedUrl ?? null;
  }

  async function showNextFullscreenImage() {
    if (selectedIndex === null || fullscreenImageIndexes.length < 2) {
      return null;
    }

    const nextCandidateIndexes = [
      ...fullscreenImageIndexes.filter((index) => index > selectedIndex),
      ...fullscreenImageIndexes.filter((index) => index < selectedIndex),
    ];

    for (const index of nextCandidateIndexes) {
      const card = displayCards[index];

      try {
        const imageUrl = await imageUrlForFullscreen(card);

        if (!imageUrl) {
          continue;
        }

        setSelectedIndex(index);
        setIsEditing(false);
        setIsSharing(false);
        onCardViewed?.(card.id);

        return imageUrl;
      } catch (error) {
        console.warn("Life Cards next fullscreen image failed", error);
      }
    }

    return null;
  }

  function handleCardSaved(card: Card) {
    setUpdatedCardsById((current) => {
      const next = new Map(current);
      next.set(card.id, card);
      return next;
    });
    onUpdateCard?.(card);
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

  function showMoreCards() {
    setVisibleLimitState((current) => {
      const currentLimit =
        current.signature === cardsSignature ? current.limit : GRID_PAGE_SIZE;

      return {
        limit: Math.min(currentLimit + GRID_PAGE_SIZE, cards.length),
        signature: cardsSignature,
      };
    });
  }

  if (cards.length === 0) {
    return (
      <div className="rounded-[12px] border border-[#e8ddcb] bg-[#fffaf0] p-8 text-sm text-[#8d7f6e] shadow-lg shadow-[#d7cab8]">
        No cards yet.
      </div>
    );
  }

  const cardTiles = displayCards.map((card, index) => (
    <div
      key={card.id}
      className={`card-enter ${
        layout === "rail" ? RAIL_ITEM_CLASS : "w-full max-w-[22rem] sm:max-w-none"
      }`}
      style={{ animationDelay: `${Math.min(index * 45, 360)}ms` }}
    >
      <CardTile
        card={card}
        deckLabel={deckLabelFor(card)}
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
        <div className="relative overflow-visible pb-1">
          <div className="relative">
            <div
              ref={railRef}
              className={RAIL_OUTER_CLASS}
              onScroll={shouldShowCarouselIndicator ? updateActiveRailIndex : undefined}
            >
              <div className={RAIL_INNER_CLASS}>{cardTiles}</div>
            </div>
          </div>

          {shouldShowCarouselIndicator ? (
            <div
              className="relative z-20 mx-auto mt-3 flex min-h-10 w-fit items-center justify-center gap-3 rounded-full border border-[#d8c8aa]/80 bg-[#fffaf0]/92 px-2 py-1.5 shadow-[0_6px_16px_rgba(87,72,52,0.14)] sm:mt-4"
              aria-label="今日の再会カードの位置"
            >
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-full border border-[#e0d3c0] bg-white/78 text-lg font-semibold leading-none text-[#5f513f] shadow-sm transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-[#d8c8aa]"
                aria-label="前の再会カードへ移動"
                onClick={() => scrollToAdjacentRailItem(-1)}
              >
                ‹
              </button>
              <div className="flex min-h-5 items-center justify-center gap-2 px-1">
                {cards.map((card, index) => (
                  <button
                    key={card.id}
                    type="button"
                    className={`h-2 rounded-full transition-all ${
                      index === activeRailIndex
                        ? "w-5 bg-[#4d4033]"
                        : "w-2 bg-[#b9a68e]"
                    }`}
                    aria-label={`${index + 1}枚目のカードへ移動`}
                    aria-current={index === activeRailIndex ? "true" : undefined}
                    onClick={() => scrollToRailIndex(index)}
                  />
                ))}
              </div>
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-full border border-[#e0d3c0] bg-white/78 text-lg font-semibold leading-none text-[#5f513f] shadow-sm transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-[#d8c8aa]"
                aria-label="次の再会カードへ移動"
                onClick={() => scrollToAdjacentRailItem(1)}
              >
                ›
              </button>
            </div>
          ) : null}
        </div>
      ) : (
        <>
          <div className={GRID_CLASS}>{cardTiles}</div>
          {shouldLimitCards && cards.length > GRID_PAGE_SIZE ? (
            <div className="mt-6 flex flex-col items-center gap-3 text-center">
              <p className="text-xs font-semibold text-[#8d7f6e]">
                {visibleCount} / {cards.length} cards 表示中
              </p>
              {hasMoreCards ? (
                <button
                  type="button"
                  onClick={showMoreCards}
                  className="inline-flex h-10 items-center justify-center rounded-full border border-[#e0d3c0] bg-[#fffaf0]/88 px-5 text-sm font-semibold text-[#5f5346] shadow-sm backdrop-blur transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-[#d8c8aa] focus:ring-offset-2 focus:ring-offset-[#f7f3ea]"
                >
                  もっと見る
                </button>
              ) : null}
            </div>
          ) : null}
        </>
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
            onClick={handlePreviewBackdropClick}
          />

          <div className="relative z-10 mx-auto flex min-h-full max-w-6xl items-center">
            <div className="relative w-full">
              {isEditing ? (
                <CardEditDialog
                  card={selectedCard}
                  currentCards={currentCardsForEdit}
                  decks={decks}
                  onClose={() => setIsEditing(false)}
                  onDecksChange={onDecksChange}
                  onSaved={handleCardSaved}
                />
              ) : (
                <CardDetailModal
                  card={selectedCard}
                  canGoNextFullscreenImage={canGoNextFullscreenImage}
                  deckLabel={deckLabelFor(selectedCard)}
                  index={selectedIndex}
                  isFavorite={activeFavoriteIds.has(selectedCard.id)}
                  hasMultipleCards={hasMultipleCards}
                  onClose={closePreview}
                  onDelete={() => deleteCard(selectedCard)}
                  onEdit={() => setIsEditing(true)}
                  onNext={showNext}
                  onNextFullscreenImage={showNextFullscreenImage}
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
              deckLabel={deckLabelFor(selectedCard)}
              onClose={() => setIsSharing(false)}
            />
          ) : null}
        </div>
      ) : null}
    </>
  );
}
