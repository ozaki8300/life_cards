"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import type { EncounterMetadata } from "@/domain/reencounter/types";
import type { Card, Deck } from "@/lib/types";
import { CardRepository } from "@/lib/cardRepository";
import { DeckRepository } from "@/lib/deckRepository";
import { EncounterRepository } from "@/lib/encounterRepository";
import { ReencounterEngine } from "@/domain/reencounter/engine";

import CardFirstNav from "./CardFirstNav";
import ReencounterSection from "./cards/ReencounterSection";
import TradingCardGrid from "./cards/TradingCardGrid";
import {
  cardSearchText,
  keywordsFor,
  sortCardsByNewest,
} from "./cards/cardHomeUtils";

type Props = {
  cards: Card[];
  decks: Deck[];
  activeDeckId?: string;
};

export default function CardHome({ cards, decks, activeDeckId }: Props) {
  const [allCards, setAllCards] = useState(cards);
  const [allDecks, setAllDecks] = useState(decks);
  const [activeTab, setActiveTab] = useState("すべて");
  const [searchQuery, setSearchQuery] = useState("");
  const [encounterMetadataByCardId, setEncounterMetadataByCardId] = useState<
    Record<string, EncounterMetadata>
  >({});
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(
    () =>
      new Set(
        cards.filter((card) => card.isFavorite).map((card) => card.id),
      ),
  );
  const scopedCards = useMemo(
    () =>
      activeDeckId
        ? allCards.filter((card) => card.deckId === activeDeckId)
        : allCards,
    [activeDeckId, allCards],
  );

  useEffect(() => {
    let isActive = true;

    queueMicrotask(() => {
      if (!isActive) {
        return;
      }

      const repositoryCards = CardRepository.getCards(cards);
      const repositoryDecks = DeckRepository.getDecks(decks);
      const repositoryEncounterMetadata = EncounterRepository.getMetadataMap();

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
    });

    return () => {
      isActive = false;
    };
  }, [cards, decks]);

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

  function toggleFavorite(cardId: string) {
    const card = allCards.find((item) => item.id === cardId);

    if (card) {
      const updatedCard = {
        ...card,
        isFavorite: !favoriteIds.has(cardId),
      };

      CardRepository.updateCard(updatedCard);
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

  const recordCardView = useCallback((cardId: string) => {
    EncounterRepository.recordView(cardId, new Date().toISOString());
  }, []);

  const recordCardReencounter = useCallback((cardId: string) => {
    EncounterRepository.recordReencounter(cardId, new Date().toISOString());
  }, []);

  const handleDeleteCard = useCallback((cardId: string) => {
    const nextCards = CardRepository.deleteCard(cardId);
    const nextEncounterMetadata = EncounterRepository.deleteMetadata(cardId);

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
  }, []);

  const activeFavoriteIds = Array.from(favoriteIds);
  const today = new Date().toISOString().slice(0, 10);
  const todayCards = useMemo(() => {
    const seedFavoriteIds = new Set(
      scopedCards
        .filter((card) => card.isFavorite)
        .map((card) => card.id),
    );

    return ReencounterEngine.pick({
      cards: scopedCards,
      favoriteIds: seedFavoriteIds,
      metadataByCardId: encounterMetadataByCardId,
      today,
    });
  }, [encounterMetadataByCardId, scopedCards, today]);

  return (
    <div className="space-y-6">
      <ReencounterSection
        title="今日の再会"
        subtitle="久しぶりに見たいカード"
        cards={todayCards}
        decks={allDecks}
        favoriteIds={activeFavoriteIds}
        onCardViewed={recordCardReencounter}
        onDeleteCard={handleDeleteCard}
        onToggleFavorite={toggleFavorite}
      />

      <CardFirstNav
        activeDeckId={activeDeckId}
        activeTab={activeTab}
        cards={allCards}
        decks={allDecks}
        searchQuery={searchQuery}
        onCardsChange={setAllCards}
        onDecksChange={setAllDecks}
        onTabChange={setActiveTab}
        onSearchChange={setSearchQuery}
      >
        <section>
          <TradingCardGrid
            cards={visibleCards}
            decks={allDecks}
            favoriteIds={activeFavoriteIds}
            onCardViewed={recordCardView}
            onDeleteCard={handleDeleteCard}
            onToggleFavorite={toggleFavorite}
          />
        </section>
      </CardFirstNav>
    </div>
  );
}
