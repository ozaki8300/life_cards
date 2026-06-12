"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { CardImageStorageRepository } from "@/lib/supabase/cardImageStorageRepository";
import type { Card, Deck } from "@/lib/types";

import CardGridDialogs from "./CardGridDialogs";
import CardTileList from "./CardTileList";
import useCardSelectionNavigation from "./useCardSelectionNavigation";

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
const GRID_PAGE_SIZE = 60;

function debugFullscreenImageLoop(payload: Record<string, unknown>) {
  if (process.env.NODE_ENV !== "production") {
    console.debug("[Life Cards fullscreen image loop]", payload);
  }
}

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
  const [flippedIds, setFlippedIds] = useState<Set<string>>(new Set());
  const [isEditing, setIsEditing] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [activeRailIndex, setActiveRailIndex] = useState(0);
  const [updatedCardsById, setUpdatedCardsById] = useState<Map<string, Card>>(
    new Map(),
  );
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
  const resetPreviewMode = useCallback(() => {
    setIsEditing(false);
    setIsSharing(false);
  }, []);
  const {
    closePreview,
    handlePreviewBackdropClick,
    handlePreviewTouchEnd,
    handlePreviewTouchStart,
    hasMultipleCards,
    openCard,
    selectedCard,
    selectedInitialViewMode,
    selectedIndex,
    selectCardIndex,
    showNext,
    showPrevious,
  } = useCardSelectionNavigation({
    cards: displayCards,
    isEditing,
    isSharing,
    onCardViewed,
    onPreviewModeReset: resetPreviewMode,
  });
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

  async function showNextFullscreenImage(currentCardId: string) {
    const currentFullscreenIndex = displayCards.findIndex(
      (card) => card.id === currentCardId,
    );
    const currentIndex =
      currentFullscreenIndex >= 0 ? currentFullscreenIndex : selectedIndex;
    const currentImagePosition =
      currentIndex === null ? -1 : fullscreenImageIndexes.indexOf(currentIndex);

    if (currentIndex === null || fullscreenImageIndexes.length < 2) {
      debugFullscreenImageLoop({
        currentCardId,
        currentFullscreenIndex,
        currentImagePosition,
        displayCardsLength: displayCards.length,
        imageIndexes: fullscreenImageIndexes,
        nextIndex: null,
        selectedIndex,
      });

      return null;
    }

    const nextIndex =
      fullscreenImageIndexes[
        ((currentImagePosition >= 0 ? currentImagePosition : 0) + 1) %
          fullscreenImageIndexes.length
      ];

    debugFullscreenImageLoop({
      currentCardId,
      currentFullscreenIndex,
      currentImagePosition,
      displayCardsLength: displayCards.length,
      imageIndexes: fullscreenImageIndexes,
      nextIndex,
      selectedIndex,
    });

    const card = displayCards[nextIndex];

    try {
      const imageUrl = await imageUrlForFullscreen(card);

      if (!imageUrl) {
        return null;
      }

      selectCardIndex(nextIndex);

      return {
        cardId: card.id,
        imageUrl,
      };
    } catch (error) {
      console.warn("Life Cards next fullscreen image failed", error);
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
      <div className="flex flex-col items-center gap-4 rounded-[12px] border border-[#e8ddcb] bg-[#fffaf0] p-8 text-center text-sm font-semibold text-[#8d7f6e] shadow-lg shadow-[#d7cab8]">
        <span>最初のカードを作りましょう。</span>
        <span className="max-w-md text-xs font-medium leading-relaxed text-[#a09280]">
          右下の＋から、残しておきたい言葉・画像・メモを保存できます。
        </span>
      </div>
    );
  }

  const cardTiles = (
    <CardTileList
      activeFavoriteIds={activeFavoriteIds}
      cards={displayCards}
      deckLabelFor={deckLabelFor}
      flippedIds={flippedIds}
      layout={layout}
      onFlip={toggleCard}
      onOpen={openCard}
      onToggleFavorite={toggleFavorite}
    />
  );

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
              className="relative z-20 mx-auto mt-2 flex min-h-7 w-fit items-center justify-center gap-1.5 rounded-full border border-[#d8c8aa]/15 bg-[#fffaf0]/20 px-1 py-0.5 shadow-none sm:mt-2.5"
              aria-label="今日の再会カードの位置"
            >
              <button
                type="button"
                className="flex h-7 w-7 items-center justify-center rounded-full border border-transparent bg-white/18 text-base font-semibold leading-none text-[#5f513f]/75 transition hover:bg-white/52 hover:text-[#5f513f] focus:outline-none focus:ring-2 focus:ring-[#d8c8aa]/70"
                aria-label="前の再会カードへ移動"
                onClick={() => scrollToAdjacentRailItem(-1)}
              >
                ‹
              </button>
              <div className="flex min-h-3 items-center justify-center gap-1 px-0.5">
                {cards.map((card, index) => (
                  <button
                    key={card.id}
                    type="button"
                    className={`h-1.5 w-1.5 rounded-full transition-colors ${
                      index === activeRailIndex
                        ? "bg-[#8f806d]/80"
                        : "bg-[#d8cdbd]/55"
                    }`}
                    aria-label={`${index + 1}枚目のカードへ移動`}
                    aria-current={index === activeRailIndex ? "true" : undefined}
                    onClick={() => scrollToRailIndex(index)}
                  />
                ))}
              </div>
              <button
                type="button"
                className="flex h-7 w-7 items-center justify-center rounded-full border border-transparent bg-white/18 text-base font-semibold leading-none text-[#5f513f]/75 transition hover:bg-white/52 hover:text-[#5f513f] focus:outline-none focus:ring-2 focus:ring-[#d8c8aa]/70"
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

      <CardGridDialogs
        canGoNextFullscreenImage={canGoNextFullscreenImage}
        card={selectedCard}
        currentCardsForEdit={currentCardsForEdit}
        deckLabel={selectedCard ? deckLabelFor(selectedCard) : ""}
        decks={decks}
        hasMultipleCards={hasMultipleCards}
        initialViewMode={selectedInitialViewMode}
        index={selectedIndex}
        isEditing={isEditing}
        isFavorite={
          selectedCard ? activeFavoriteIds.has(selectedCard.id) : false
        }
        isSharing={isSharing}
        onBackdropClick={handlePreviewBackdropClick}
        onDecksChange={onDecksChange}
        onDelete={deleteCard}
        onDetailClose={closePreview}
        onEdit={() => setIsEditing(true)}
        onEditClose={() => setIsEditing(false)}
        onNext={showNext}
        onNextFullscreenImage={showNextFullscreenImage}
        onPrevious={showPrevious}
        onSaved={handleCardSaved}
        onShare={() => setIsSharing(true)}
        onShareClose={() => setIsSharing(false)}
        onToggleFavorite={() => {
          if (selectedCard) {
            toggleFavorite(selectedCard.id);
          }
        }}
        onTouchEnd={handlePreviewTouchEnd}
        onTouchStart={handlePreviewTouchStart}
      />
    </>
  );
}
