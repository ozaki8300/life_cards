"use client";

import { useEffect, useMemo, useState } from "react";

import type { Card, Deck } from "@/lib/types";
import { CardRepository } from "@/lib/cardRepository";
import { DeckRepository } from "@/lib/deckRepository";

import CardFirstNav from "./CardFirstNav";
import ReencounterSection from "./cards/ReencounterSection";
import TradingCardGrid from "./cards/TradingCardGrid";
import {
  cardSearchText,
  keywordsFor,
  pickReencounterCards,
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

      setAllCards(repositoryCards);
      setAllDecks(repositoryDecks);
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

  const activeFavoriteIds = Array.from(favoriteIds);
  const todayCards = useMemo(() => {
    const seedFavoriteIds = new Set(
      scopedCards
        .filter((card) => card.isFavorite)
        .map((card) => card.id),
    );

    return pickReencounterCards(scopedCards, seedFavoriteIds);
  }, [scopedCards]);

  return (
    <div className="space-y-6">
      <ReencounterSection
        title="今日の再会"
        subtitle="久しぶりに見たいカード"
        cards={todayCards}
        decks={allDecks}
        favoriteIds={activeFavoriteIds}
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
            onToggleFavorite={toggleFavorite}
          />
        </section>
      </CardFirstNav>
    </div>
  );
}
