"use client";

import { useEffect, useMemo, useState } from "react";

import type { Card, Deck } from "@/lib/types";
import { recordDailyAppOpened } from "@/lib/usageEvents";

import CardFirstNav from "./CardFirstNav";
import ProfileSetupModal from "./auth/ProfileSetupModal";
import CardsPageHeader from "./cards/CardsPageHeader";
import CardMatrixView from "./cards/CardMatrixView";
import ReencounterSection from "./cards/ReencounterSection";
import TradingCardGrid from "./cards/TradingCardGrid";
import {
  cardSearchText,
  keywordsFor,
  sortCardsByNewest,
} from "./cards/cardHomeUtils";
import useCardHomeData, {
  type CardHomeLoadStatus,
} from "./cards/useCardHomeData";
import useReencounterCards from "./cards/useReencounterCards";

type ViewStatus = CardHomeLoadStatus | "filteredEmpty";
type CardViewMode = "list" | "matrix";

type Props = {
  cards: Card[];
  decks: Deck[];
  activeDeckId?: string;
};

export default function CardHome({ cards, decks, activeDeckId }: Props) {
  const [activeTab, setActiveTab] = useState("すべて");
  const [viewMode, setViewMode] = useState<CardViewMode>("list");
  const [searchQuery, setSearchQuery] = useState("");
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

  const activeFavoriteIds = useMemo(
    () => Array.from(favoriteIds),
    [favoriteIds],
  );
  const todayCards = useReencounterCards({
    cards: scopedCards,
    favoriteIds,
    metadataByCardId: encounterMetadataByCardId,
  });

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
          {loadStatus !== "ready" ? (
            <section>
              <CardHomeStatus isLoading message="カードを読み込んでいます..." />
            </section>
          ) : (
            <>
              {!isSearching ? (
                <ReencounterSection
                  title="今日の再会"
                  subtitle="久しぶりに見たいカード"
                  cards={todayCards}
                  decks={allDecks}
                  editSeedCards={allCards}
                  favoriteIds={activeFavoriteIds}
                  onCardViewed={recordCardReencounter}
                  onDecksChange={setAllDecks}
                  onDeleteCard={handleDeleteCard}
                  onUpdateCard={handleUpdateCard}
                  onToggleFavorite={toggleFavorite}
                />
              ) : null}

              <section>
                <div className="mb-3 flex justify-center sm:justify-start">
                  <div
                    className="inline-flex rounded-full border border-[#e0d3c0]/70 bg-[#fffaf0]/36 p-0.5"
                    aria-label="カード表示切替"
                  >
                    <button
                      type="button"
                      aria-pressed={viewMode === "list"}
                      onClick={() => setViewMode("list")}
                      className={`min-h-8 rounded-full px-3 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-[#d8c8aa]/70 ${
                        viewMode === "list"
                          ? "bg-[#6f6253]/88 text-[#fffaf0]"
                          : "text-[#8d7f6e] hover:bg-white/42 hover:text-[#5f5346]"
                      }`}
                    >
                      一覧
                    </button>
                    <button
                      type="button"
                      aria-pressed={viewMode === "matrix"}
                      onClick={() => setViewMode("matrix")}
                      className={`min-h-8 rounded-full px-3 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-[#d8c8aa]/70 ${
                        viewMode === "matrix"
                          ? "bg-[#6f6253]/88 text-[#fffaf0]"
                          : "text-[#8d7f6e] hover:bg-white/42 hover:text-[#5f5346]"
                      }`}
                    >
                      マトリクス
                    </button>
                  </div>
                </div>
                {viewStatus === "empty" ? (
                  <CardHomeStatus
                    message="最初のカードを作りましょう。"
                    description="右下の＋から、残しておきたい言葉・画像・メモを保存できます。"
                  />
                ) : null}
                {viewStatus === "filteredEmpty" ? (
                  <CardHomeStatus message="該当するカードがありません。" />
                ) : null}
                {viewStatus === "ready" && viewMode === "list" ? (
                  <TradingCardGrid
                    cards={visibleCards}
                    decks={allDecks}
                    editSeedCards={allCards}
                    favoriteIds={activeFavoriteIds}
                    onCardViewed={recordCardView}
                    onDecksChange={setAllDecks}
                    onDeleteCard={handleDeleteCard}
                    onUpdateCard={handleUpdateCard}
                    onToggleFavorite={toggleFavorite}
                  />
                ) : null}
                {viewStatus === "ready" && viewMode === "matrix" ? (
                  <CardMatrixView
                    cards={visibleCards}
                    decks={allDecks}
                    editSeedCards={allCards}
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
