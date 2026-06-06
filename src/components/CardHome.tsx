"use client";

import { useMemo, useState } from "react";

import type { Card, Deck } from "@/lib/types";

import CardFirstNav from "./CardFirstNav";
import TradingCardGrid from "./TradingCardGrid";

type Props = {
  cards: Card[];
  decks: Deck[];
  activeDeckId?: string;
};

function keywordsFor(query: string) {
  return query
    .trim()
    .split(/[\s　]+/)
    .filter(Boolean)
    .map((keyword) => keyword.toLowerCase());
}

function cardSearchText(card: Card, decks: Deck[]) {
  const deckName = decks.find((deck) => deck.id === card.deckId)?.name ?? "";

  return [
    card.frontText,
    card.backText,
    deckName,
    card.createdAt,
    card.updatedAt,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function sortCardsByNewest(cards: Card[]) {
  return cards
    .map((card, index) => ({ card, index }))
    .sort((a, b) => {
      const dateCompare = b.card.createdAt.localeCompare(a.card.createdAt);

      return dateCompare === 0 ? b.index - a.index : dateCompare;
    })
    .map(({ card }) => card);
}

function pickReencounterCards(cards: Card[], favoriteIds: Set<string>) {
  const picked: Card[] = [];
  const pickedIds = new Set<string>();

  // MVP: favorite cards first. Later this becomes lastViewedAt/reencounterScore/randomSeed.
  for (const card of cards) {
    if (favoriteIds.has(card.id) && picked.length < 5) {
      picked.push(card);
      pickedIds.add(card.id);
    }
  }

  for (const card of cards) {
    if (picked.length >= 5) {
      break;
    }

    if (!pickedIds.has(card.id)) {
      picked.push(card);
      pickedIds.add(card.id);
    }
  }

  return picked;
}

function ReencounterSection({
  title,
  subtitle,
  cards,
  decks,
  favoriteIds,
  onToggleFavorite,
}: {
  title: string;
  subtitle: string;
  cards: Card[];
  decks: Deck[];
  favoriteIds: string[];
  onToggleFavorite: (cardId: string) => void;
}) {
  if (cards.length === 0) {
    return null;
  }

  return (
    <section className="w-fit max-w-full">
      <div className="mb-3">
        <h2 className="text-lg font-semibold tracking-tight text-[#332d25] sm:text-xl">
          {title}
        </h2>
        <p className="mt-0.5 text-xs font-medium text-[#b2a491]">
          {subtitle}
        </p>
      </div>
      <TradingCardGrid
        cards={cards}
        decks={decks}
        favoriteIds={favoriteIds}
        layout="rail"
        onToggleFavorite={onToggleFavorite}
      />
    </section>
  );
}

export default function CardHome({ cards, decks, activeDeckId }: Props) {
  const [activeTab, setActiveTab] = useState("すべて");
  const [searchQuery, setSearchQuery] = useState("");
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(
    () =>
      new Set(
        cards.filter((card) => card.isFavorite).map((card) => card.id),
      ),
  );

  const visibleCards = useMemo(() => {
    const keywords = keywordsFor(searchQuery);
    const tabFilteredCards =
      activeTab === "お気に入り"
        ? cards.filter((card) => favoriteIds.has(card.id))
        : cards;

    const filteredCards =
      keywords.length === 0
        ? tabFilteredCards
        : tabFilteredCards.filter((card) => {
            const searchText = cardSearchText(card, decks);

            return keywords.every((keyword) => searchText.includes(keyword));
          });

    return sortCardsByNewest(filteredCards);
  }, [activeTab, cards, decks, favoriteIds, searchQuery]);

  function toggleFavorite(cardId: string) {
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
  const todayCards = useMemo(
    () => pickReencounterCards(cards, favoriteIds),
    [cards, favoriteIds],
  );

  return (
    <div className="space-y-6">
      <ReencounterSection
        title="今日の再会"
        subtitle="久しぶりに見たいカード"
        cards={todayCards}
        decks={decks}
        favoriteIds={activeFavoriteIds}
        onToggleFavorite={toggleFavorite}
      />

      <CardFirstNav
        decks={decks}
        activeDeckId={activeDeckId}
        activeTab={activeTab}
        searchQuery={searchQuery}
        onTabChange={setActiveTab}
        onSearchChange={setSearchQuery}
      >
        <section>
          <TradingCardGrid
            cards={visibleCards}
            decks={decks}
            favoriteIds={activeFavoriteIds}
            onToggleFavorite={toggleFavorite}
          />
        </section>
      </CardFirstNav>
    </div>
  );
}
