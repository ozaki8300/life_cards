"use client";

import { useEffect, useMemo, useState } from "react";

import { CardImageStorageRepository } from "@/lib/supabase/cardImageStorageRepository";
import type { Card, Deck } from "@/lib/types";
import { recordDailyAppOpened } from "@/lib/usageEvents";

import CardFirstNav from "./CardFirstNav";
import ProfileSetupModal from "./auth/ProfileSetupModal";
import CardsPageHeader from "./cards/CardsPageHeader";
import ReencounterSection from "./cards/ReencounterSection";
import TradingCardGrid from "./cards/TradingCardGrid";
import {
  cardSearchText,
  keywordsFor,
  sortCardsByNewest,
} from "./cards/cardHomeUtils";
import { defaultImageForCard } from "./cards/cardUiUtils";
import useCardHomeData, {
  type CardHomeLoadStatus,
} from "./cards/useCardHomeData";
import useReencounterCards from "./cards/useReencounterCards";

type ViewStatus = CardHomeLoadStatus | "filteredEmpty";

type Props = {
  cards: Card[];
  decks: Deck[];
  activeDeckId?: string;
};

type CardImagePreloadState = {
  isReady: boolean;
  signature: string;
  urlsByStoragePath: Record<string, string>;
};

function cardImagePreloadSignature(cards: Card[]) {
  return cards
    .map(
      (card) =>
        [
          card.id,
          card.imagePath ?? "",
          card.imageStoragePath ?? "",
          card.defaultImageKey ?? "",
        ].join(":"),
    )
    .join("|");
}

function uniqueCardsById(cards: Card[]) {
  const seenCardIds = new Set<string>();

  return cards.filter((card) => {
    if (seenCardIds.has(card.id)) {
      return false;
    }

    seenCardIds.add(card.id);
    return true;
  });
}

function preloadImageUrl(url: string) {
  if (!url || typeof window === "undefined") {
    return Promise.resolve();
  }

  return new Promise<void>((resolve) => {
    const image = new Image();

    image.onload = () => resolve();
    image.onerror = () => resolve();
    image.src = url;
  });
}

export default function CardHome({ cards, decks, activeDeckId }: Props) {
  const [activeTab, setActiveTab] = useState("すべて");
  const [searchQuery, setSearchQuery] = useState("");
  const [cardImagePreloadState, setCardImagePreloadState] =
    useState<CardImagePreloadState>({
      isReady: false,
      signature: "",
      urlsByStoragePath: {},
    });
  const {
    allCards,
    allDecks,
    encounterMetadataByCardId,
    favoriteIds,
    handleDeleteCard,
    handleProfileSaved,
    handleUpdateCard,
    isProfileSetupOpen,
    loadStatus,
    profileDisplayName,
    recordCardReencounter,
    recordCardView,
    setAllCards,
    setAllDecks,
    toggleFavorite,
  } = useCardHomeData({
    initialCards: cards,
    initialDecks: decks,
  });
  const scopedCards = useMemo(
    () =>
      activeDeckId
        ? allCards.filter((card) => card.deckId === activeDeckId)
        : allCards,
    [activeDeckId, allCards],
  );

  const visibleCards = useMemo(() => {
    const keywords = keywordsFor(searchQuery);
    const tabFilteredCards =
      activeTab === "お気に入り"
        ? scopedCards.filter((card) => favoriteIds.has(card.id))
        : scopedCards;

    const filteredCards =
      keywords.length === 0
        ? tabFilteredCards
        : tabFilteredCards.filter((card) => {
            const searchText = cardSearchText(card, allDecks);

            return keywords.every((keyword) => searchText.includes(keyword));
          });

    return sortCardsByNewest(filteredCards);
  }, [activeTab, allDecks, favoriteIds, scopedCards, searchQuery]);
  const activeDeckName = useMemo(() => {
    if (!activeDeckId) {
      return undefined;
    }

    return (
      allDecks.find((deck) => deck.id === activeDeckId)?.name ??
      (activeDeckId === "uncategorized" ? "未分類" : "Deck")
    );
  }, [activeDeckId, allDecks]);
  const isDataReady = loadStatus === "ready" || loadStatus === "empty";
  const isSearching = searchQuery.trim().length > 0;
  const viewStatus: ViewStatus =
    loadStatus === "ready" && scopedCards.length === 0
      ? "empty"
      : loadStatus === "ready" && visibleCards.length === 0
        ? "filteredEmpty"
        : loadStatus;

  useEffect(() => {
    if (isDataReady) {
      void recordDailyAppOpened();
    }
  }, [isDataReady]);

  const activeFavoriteIds = Array.from(favoriteIds);
  const todayCards = useReencounterCards({
    cards: scopedCards,
    favoriteIds,
    metadataByCardId: encounterMetadataByCardId,
  });
  const preloadCards = useMemo(
    () =>
      loadStatus === "ready"
        ? uniqueCardsById(isSearching ? visibleCards : [...visibleCards, ...todayCards])
        : [],
    [isSearching, loadStatus, todayCards, visibleCards],
  );
  const preloadSignature = useMemo(
    () => cardImagePreloadSignature(preloadCards),
    [preloadCards],
  );
  const areCardImagesReady =
    loadStatus === "ready" &&
    cardImagePreloadState.signature === preloadSignature &&
    cardImagePreloadState.isReady;
  const preparedCardsById = useMemo(() => {
    if (!areCardImagesReady) {
      return new Map<string, Card>();
    }

    return new Map(
      allCards.map((card) => {
        const imageStoragePath = card.imageStoragePath?.trim();
        const signedImagePath = imageStoragePath
          ? cardImagePreloadState.urlsByStoragePath[imageStoragePath]
          : "";

        return [
          card.id,
          signedImagePath ? { ...card, imagePath: signedImagePath } : card,
        ];
      }),
    );
  }, [
    allCards,
    areCardImagesReady,
    cardImagePreloadState.urlsByStoragePath,
  ]);
  const preparedAllCards = useMemo(
    () =>
      allCards.map((card) => preparedCardsById.get(card.id) ?? card),
    [allCards, preparedCardsById],
  );
  const preparedVisibleCards = useMemo(
    () =>
      visibleCards.map((card) => preparedCardsById.get(card.id) ?? card),
    [preparedCardsById, visibleCards],
  );
  const preparedTodayCards = useMemo(
    () =>
      todayCards.map((card) => preparedCardsById.get(card.id) ?? card),
    [preparedCardsById, todayCards],
  );

  useEffect(() => {
    if (loadStatus !== "ready") {
      return;
    }

    let isActive = true;

    async function preloadCardImages() {
      const storagePaths = Array.from(
        new Set(
          preloadCards
            .map((card) => card.imageStoragePath?.trim() ?? "")
            .filter(Boolean),
        ),
      );
      const signedEntries = await Promise.all(
        storagePaths.map(async (path) => {
          try {
            return [
              path,
              (await CardImageStorageRepository.getCachedSignedImageUrl(path)) ??
                "",
            ] as const;
          } catch (error) {
            console.warn("Life Cards card image preload failed", error);
            return [path, ""] as const;
          }
        }),
      );
      const urlsByStoragePath = Object.fromEntries(
        signedEntries.filter(([, signedUrl]) => signedUrl),
      );
      const imageUrls = Array.from(
        new Set(
          preloadCards.map((card) => {
            const directImagePath = card.imagePath?.trim();

            if (directImagePath) {
              return directImagePath;
            }

            const imageStoragePath = card.imageStoragePath?.trim();
            const signedImagePath = imageStoragePath
              ? urlsByStoragePath[imageStoragePath]
              : "";

            return signedImagePath || defaultImageForCard(card);
          }),
        ),
      );

      await Promise.all(imageUrls.map(preloadImageUrl));

      if (!isActive) {
        return;
      }

      setCardImagePreloadState((current) => ({
        isReady: true,
        signature: preloadSignature,
        urlsByStoragePath: {
          ...current.urlsByStoragePath,
          ...urlsByStoragePath,
        },
      }));
    }

    void preloadCardImages();

    return () => {
      isActive = false;
    };
  }, [loadStatus, preloadCards, preloadSignature]);

  return (
    <>
      <CardFirstNav
        activeDeckId={activeDeckId}
        activeTab={activeTab}
        cards={allCards}
        decks={allDecks}
        header={
          <CardsPageHeader
            cardCount={
              activeDeckId && isDataReady ? scopedCards.length : undefined
            }
            deckName={activeDeckName}
          />
        }
        isDataReady={isDataReady}
        searchQuery={searchQuery}
        onCardsChange={setAllCards}
        onDecksChange={setAllDecks}
        onTabChange={setActiveTab}
        onSearchChange={setSearchQuery}
      >
        <div className="space-y-6">
          {loadStatus !== "ready" || !areCardImagesReady ? (
            <section>
              <CardHomeStatus isLoading message="カードを読み込んでいます..." />
            </section>
          ) : (
            <>
              {!isSearching ? (
                <ReencounterSection
                  title="今日の再会"
                  subtitle="久しぶりに見たいカード"
                  cards={preparedTodayCards}
                  decks={allDecks}
                  editSeedCards={preparedAllCards}
                  favoriteIds={activeFavoriteIds}
                  onCardViewed={recordCardReencounter}
                  onDecksChange={setAllDecks}
                  onDeleteCard={handleDeleteCard}
                  onUpdateCard={handleUpdateCard}
                  onToggleFavorite={toggleFavorite}
                />
              ) : null}

              <section>
                {viewStatus === "empty" ? (
                  <CardHomeStatus
                    message="最初のカードを作りましょう。"
                    description="右下の＋から、残しておきたい言葉・画像・メモを保存できます。"
                  />
                ) : null}
                {viewStatus === "filteredEmpty" ? (
                  <CardHomeStatus message="該当するカードがありません。" />
                ) : null}
                {viewStatus === "ready" ? (
                  <TradingCardGrid
                    cards={preparedVisibleCards}
                    decks={allDecks}
                    editSeedCards={preparedAllCards}
                    favoriteIds={activeFavoriteIds}
                    onCardViewed={recordCardView}
                    onDecksChange={setAllDecks}
                    onDeleteCard={handleDeleteCard}
                    onUpdateCard={handleUpdateCard}
                    onToggleFavorite={toggleFavorite}
                  />
                ) : null}
              </section>
            </>
          )}
        </div>
      </CardFirstNav>

      {isProfileSetupOpen ? (
        <ProfileSetupModal
          initialDisplayName={profileDisplayName}
          onSaved={handleProfileSaved}
        />
      ) : null}
    </>
  );
}

function LoadingSpinner() {
  return (
    <span
      className="h-9 w-9 animate-spin rounded-full border-[3px] border-[#d8c8aa] border-t-[#6f6253]"
      aria-hidden="true"
    />
  );
}

function CardHomeStatus({
  description,
  isLoading = false,
  message,
}: {
  description?: string;
  isLoading?: boolean;
  message: string;
}) {
  return (
    <div
      className="flex min-h-[160px] flex-col items-center justify-center gap-4 rounded-[12px] border border-[#e8ddcb] bg-[#fffaf0] p-8 text-center text-sm font-semibold text-[#8d7f6e] shadow-lg shadow-[#d7cab8]"
      role={isLoading ? "status" : undefined}
      aria-live={isLoading ? "polite" : undefined}
    >
      {isLoading ? <LoadingSpinner /> : null}
      <span>{message}</span>
      {description ? (
        <span className="max-w-md text-xs font-medium leading-relaxed text-[#a09280]">
          {description}
        </span>
      ) : null}
    </div>
  );
}
