"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import type { EncounterMetadata } from "@/domain/reencounter/types";
import type { Card, Deck } from "@/lib/types";
import { CardRepository } from "@/lib/cardRepository";
import { DeckRepository } from "@/lib/deckRepository";
import { EncounterRepository } from "@/lib/encounterRepository";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { getProfileForCurrentUser } from "@/lib/supabase/profileSupabaseRepository";

import CardFirstNav from "./CardFirstNav";
import ProfileSetupModal from "./auth/ProfileSetupModal";
import CardsPageHeader from "./cards/CardsPageHeader";
import ReencounterSection from "./cards/ReencounterSection";
import TradingCardGrid from "./cards/TradingCardGrid";
import {
  cardSearchText,
  keywordsFor,
  pickReencounterCards,
  sortCardsByNewest,
} from "./cards/cardHomeUtils";

type LoadStatus = "loading" | "ready" | "empty" | "error";
type ViewStatus = LoadStatus | "filteredEmpty";

type Props = {
  cards: Card[];
  decks: Deck[];
  activeDeckId?: string;
};

export default function CardHome({ cards, decks, activeDeckId }: Props) {
  const [allCards, setAllCards] = useState<Card[]>([]);
  const [allDecks, setAllDecks] = useState<Deck[]>([]);
  const [loadStatus, setLoadStatus] = useState<LoadStatus>("loading");
  const [activeTab, setActiveTab] = useState("すべて");
  const [searchQuery, setSearchQuery] = useState("");
  const [encounterMetadataByCardId, setEncounterMetadataByCardId] = useState<
    Record<string, EncounterMetadata>
  >({});
  const [isProfileSetupOpen, setIsProfileSetupOpen] = useState(false);
  const [profileDisplayName, setProfileDisplayName] = useState("");
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(() => new Set());
  const scopedCards = useMemo(
    () =>
      activeDeckId
        ? allCards.filter((card) => card.deckId === activeDeckId)
        : allCards,
    [activeDeckId, allCards],
  );

  useEffect(() => {
    let isActive = true;

    queueMicrotask(async () => {
      if (!isActive) {
        return;
      }

      setLoadStatus("loading");

      try {
        const supabase = createSupabaseBrowserClient();
        await supabase.auth.getSession();

        const [repositoryDecks, repositoryCards, repositoryEncounterMetadata] =
          await Promise.all([
            DeckRepository.getDecksForCurrentUser(decks),
            CardRepository.getCardsForCurrentUser(cards),
            EncounterRepository.getMetadataMapForCurrentUser(),
          ]);

        if (!isActive) {
          return;
        }

        setAllCards(repositoryCards);
        setAllDecks(repositoryDecks);
        setEncounterMetadataByCardId(repositoryEncounterMetadata);
        setFavoriteIds(
          new Set(
            repositoryCards
              .filter((card) => card.isFavorite)
              .map((card) => card.id),
          ),
        );
        setLoadStatus(repositoryCards.length === 0 ? "empty" : "ready");
      } catch {
        if (!isActive) {
          return;
        }

        setAllCards([]);
        setAllDecks([]);
        setEncounterMetadataByCardId({});
        setFavoriteIds(new Set());
        setLoadStatus("error");
      }
    });

    return () => {
      isActive = false;
    };
  }, [cards, decks]);

  useEffect(() => {
    let isActive = true;

    queueMicrotask(async () => {
      try {
        const supabase = createSupabaseBrowserClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!isActive || !session?.user) {
          return;
        }

        const profile = await getProfileForCurrentUser();
        const displayName = profile?.displayName.trim() ?? "";

        if (!isActive) {
          return;
        }

        setProfileDisplayName(displayName);
        setIsProfileSetupOpen(!displayName);
      } catch (error) {
        console.warn("Life Cards profile load failed", error);
      }
    });

    return () => {
      isActive = false;
    };
  }, []);

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
  const viewStatus: ViewStatus =
    loadStatus === "ready" && scopedCards.length === 0
      ? "empty"
      : loadStatus === "ready" && visibleCards.length === 0
        ? "filteredEmpty"
        : loadStatus;

  async function toggleFavorite(cardId: string) {
    const card = allCards.find((item) => item.id === cardId);

    if (card) {
      const updatedCard = {
        ...card,
        isFavorite: !favoriteIds.has(cardId),
      };

      const nextCards = await CardRepository.updateCardForCurrentUser(
        updatedCard,
        allCards,
      );

      setAllCards(nextCards);
    }

    setFavoriteIds((current) => {
      const next = new Set(current);

      if (next.has(cardId)) {
        next.delete(cardId);
      } else {
        next.add(cardId);
      }

      return next;
    });
  }

  const recordCardView = useCallback(async (cardId: string) => {
    const nextEncounterMetadata =
      await EncounterRepository.recordViewForCurrentUser(
        cardId,
        new Date().toISOString(),
      );

    setEncounterMetadataByCardId(nextEncounterMetadata);
  }, []);

  const recordCardReencounter = useCallback(async (cardId: string) => {
    const nextEncounterMetadata =
      await EncounterRepository.recordReencounterForCurrentUser(
        cardId,
        new Date().toISOString(),
      );

    setEncounterMetadataByCardId(nextEncounterMetadata);
  }, []);

  const handleDeleteCard = useCallback(async (cardId: string) => {
    const nextCards = await CardRepository.deleteCardForCurrentUser(
      cardId,
      allCards,
    );
    const nextEncounterMetadata =
      await EncounterRepository.deleteMetadataForCurrentUser(cardId);

    setAllCards(nextCards);
    setEncounterMetadataByCardId(nextEncounterMetadata);
    setFavoriteIds((current) => {
      if (!current.has(cardId)) {
        return current;
      }

      const next = new Set(current);
      next.delete(cardId);
      return next;
    });
  }, [allCards]);

  const handleUpdateCard = useCallback((card: Card) => {
    setAllCards((currentCards) =>
      currentCards.map((item) => (item.id === card.id ? card : item)),
    );
  }, []);

  const activeFavoriteIds = Array.from(favoriteIds);
  const today = new Date().toISOString().slice(0, 10);
  const todayCards = useMemo(
    () =>
      pickReencounterCards({
        cards: scopedCards,
        favoriteIds,
        metadataByCardId: encounterMetadataByCardId,
        today,
      }),
    [encounterMetadataByCardId, favoriteIds, scopedCards, today],
  );

  return (
    <>
      <CardsPageHeader
        cardCount={
          activeDeckId && isDataReady ? scopedCards.length : undefined
        }
        deckName={activeDeckName}
      />

      <div className="space-y-6">
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

        <CardFirstNav
          activeDeckId={activeDeckId}
          activeTab={activeTab}
          cards={allCards}
          decks={allDecks}
          isDataReady={isDataReady}
          searchQuery={searchQuery}
          onCardsChange={setAllCards}
          onDecksChange={setAllDecks}
          onTabChange={setActiveTab}
          onSearchChange={setSearchQuery}
        >
          <section>
            {viewStatus === "loading" ? (
              <CardHomeStatus isLoading message="カードを読み込んでいます" />
            ) : null}
            {viewStatus === "error" ? (
              <CardHomeStatus message="カードを読み込めませんでした。時間をおいてもう一度お試しください。" />
            ) : null}
            {viewStatus === "empty" ? (
              <CardHomeStatus message="No cards yet." />
            ) : null}
            {viewStatus === "filteredEmpty" ? (
              <CardHomeStatus message="該当するカードがありません。" />
            ) : null}
            {viewStatus === "ready" ? (
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
          </section>
        </CardFirstNav>
      </div>

      {isProfileSetupOpen ? (
        <ProfileSetupModal
          initialDisplayName={profileDisplayName}
          onSaved={(displayName) => {
            setProfileDisplayName(displayName);
            setIsProfileSetupOpen(false);
          }}
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
  isLoading = false,
  message,
}: {
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
    </div>
  );
}
