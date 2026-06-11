"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent, ReactNode } from "react";

import { CardRepository } from "@/lib/cardRepository";
import { DeckRepository } from "@/lib/deckRepository";
import { EncounterRepository } from "@/lib/encounterRepository";
import type { Card, Deck } from "@/lib/types";
import { useEscapeKey } from "@/lib/useEscapeKey";

import AboutLifeCardsModal from "./AboutLifeCardsModal";
import CardSearchMenu from "./CardSearchMenu";
import DeckPanel from "./DeckPanel";
import HeaderButtons from "./HeaderButtons";
import DeckCreateModal from "./cards/DeckCreateModal";
import { todayInputValue } from "./cards/cardFormUtils";

type Props = {
  activeDeckId?: string;
  activeTab?: string;
  cards: Card[];
  decks: Deck[];
  isDataReady?: boolean;
  searchQuery?: string;
  header?: ReactNode;
  onCardsChange?: (cards: Card[]) => void;
  onDecksChange?: (decks: Deck[]) => void;
  onTabChange?: (tab: string) => void;
  onSearchChange?: (query: string) => void;
  children: React.ReactNode;
};

export default function CardFirstNav({
  activeDeckId,
  activeTab = "すべて",
  cards,
  decks,
  isDataReady = true,
  searchQuery = "",
  header,
  onCardsChange,
  onDecksChange,
  onTabChange,
  onSearchChange,
  children,
}: Props) {
  const router = useRouter();
  const [deckSearchQuery, setDeckSearchQuery] = useState("");
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isDeckCreateOpen, setIsDeckCreateOpen] = useState(false);
  const [isDeckPanelOpen, setIsDeckPanelOpen] = useState(false);
  const [deckDeleteTarget, setDeckDeleteTarget] = useState<Deck | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const uncategorizedDeck = decks.find((deck) => deck.id === "uncategorized");
  const shouldShowUncategorizedDeck = Boolean(
    uncategorizedDeck &&
      (activeDeckId === "uncategorized" ||
        cards.some((card) => card.deckId === "uncategorized")),
  );
  const displayDecks = shouldShowUncategorizedDeck && uncategorizedDeck
    ? [
        ...decks.filter((deck) => deck.id !== "uncategorized"),
        uncategorizedDeck,
      ]
    : decks.filter((deck) => deck.id !== "uncategorized");
  const filteredDecks = displayDecks.filter((deck) =>
    deck.name.toLowerCase().includes(deckSearchQuery.trim().toLowerCase()),
  );
  const reorderableDecks = displayDecks.filter(
    (deck) => deck.id !== "uncategorized",
  );

  function cardCountFor(deckId: string) {
    return cards.filter((card) => card.deckId === deckId).length;
  }

  function reorderWithUncategorizedLast(nextReorderableDecks: Deck[]) {
    return uncategorizedDeck
      ? [...nextReorderableDecks, uncategorizedDeck]
      : nextReorderableDecks;
  }

  async function moveDeck(deckId: string, direction: "up" | "down") {
    const currentIndex = reorderableDecks.findIndex((deck) => deck.id === deckId);
    const nextIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;

    if (
      currentIndex < 0 ||
      nextIndex < 0 ||
      nextIndex >= reorderableDecks.length
    ) {
      return;
    }

    const nextReorderableDecks = [...reorderableDecks];
    const targetDeck = nextReorderableDecks[currentIndex];
    const swapDeck = nextReorderableDecks[nextIndex];

    nextReorderableDecks[currentIndex] = swapDeck;
    nextReorderableDecks[nextIndex] = targetDeck;

    const nextDecks = await DeckRepository.reorderDecksForCurrentUser(
      reorderWithUncategorizedLast(nextReorderableDecks),
    );

    onDecksChange?.(nextDecks);
  }

  async function handleCreateDeck(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const deckName = String(formData.get("deckName") ?? "").trim();

    if (!deckName) {
      alert("デッキ名を入力してください。");
      return;
    }

    const nextDeck: Deck = {
      id: `deck_${Date.now()}`,
      name: deckName,
      cardCount: 0,
      isShared: false,
      createdAt: todayInputValue(),
    };
    const nextDecks = await DeckRepository.saveDeckForCurrentUser(nextDeck);

    onDecksChange?.(nextDecks);
    setDeckSearchQuery("");
    setIsDeckCreateOpen(false);
  }

  async function ensureUncategorizedDeck(deckList: Deck[]) {
    const uncategorizedDeck = deckList.find(
      (deck) => deck.id === "uncategorized",
    );

    if (uncategorizedDeck) {
      return deckList;
    }

    return DeckRepository.saveDeckForCurrentUser({
      id: "uncategorized",
      name: "未分類",
      cardCount: 0,
      isShared: false,
      createdAt: todayInputValue(),
    });
  }

  async function deleteDeckMovingCards(deck: Deck) {
    await ensureUncategorizedDeck(decks);
    const nextCards = await CardRepository.moveCardsToDeckForCurrentUser(
      deck.id,
      "uncategorized",
      cards,
    );
    const nextDecks = await DeckRepository.deleteDeckForCurrentUser(deck.id);

    onDecksChange?.(nextDecks);
    onCardsChange?.(nextCards);
    finishDeckDeletion(deck);
  }

  async function deleteDeckWithCards(deck: Deck) {
    const targetCards = cards.filter((card) => card.deckId === deck.id);
    let nextCards = cards;

    for (const card of targetCards) {
      nextCards = await CardRepository.deleteCardForCurrentUser(
        card.id,
        nextCards,
      );
      await EncounterRepository.deleteMetadataForCurrentUser(card.id);
    }

    const nextDecks = await DeckRepository.deleteDeckForCurrentUser(deck.id);

    onDecksChange?.(nextDecks);
    onCardsChange?.(nextCards);
    finishDeckDeletion(deck);
  }

  function finishDeckDeletion(deck: Deck) {
    setDeckDeleteTarget(null);
    if (activeDeckId === deck.id) {
      setIsDeckPanelOpen(false);
      router.push("/cards");
    }
  }

  function closeSearchMenu() {
    onSearchChange?.("");
    setIsMenuOpen(false);
  }

  useEscapeKey(() => setIsDeckPanelOpen(false), {
    enabled: isDeckPanelOpen,
    ignoreEditable: false,
  });
  useEscapeKey(() => setDeckDeleteTarget(null), {
    enabled: Boolean(deckDeleteTarget),
    ignoreEditable: false,
  });
  useEscapeKey(closeSearchMenu, {
    enabled: isMenuOpen,
    ignoreEditable: false,
  });
  const navActions = (
    <HeaderButtons
      onOpenDecks={() => setIsDeckPanelOpen(true)}
      onOpenMenu={() => setIsMenuOpen(true)}
    />
  );

  return (
    <>
      {header ? (
        <div className="mb-7 flex items-start justify-between gap-3 lg:block">
          <div className="min-w-0 flex-1">{header}</div>
          {navActions}
        </div>
      ) : (
        <div className="mb-7 flex justify-end lg:mb-0">{navActions}</div>
      )}

      {children}

      {isDeckPanelOpen ? (
        <DeckPanel
          activeDeckId={activeDeckId}
          allCardsCount={cards.length}
          cardCountFor={cardCountFor}
          deckSearchQuery={deckSearchQuery}
          filteredDecks={filteredDecks}
          isDataReady={isDataReady}
          onClose={() => setIsDeckPanelOpen(false)}
          onCreateDeck={() => setIsDeckCreateOpen(true)}
          onDeleteDeck={setDeckDeleteTarget}
          onMoveDeck={moveDeck}
          onSearchChange={setDeckSearchQuery}
          reorderableDecks={reorderableDecks}
        />
      ) : null}

      {isMenuOpen ? (
        <CardSearchMenu
          activeTab={activeTab}
          searchQuery={searchQuery}
          onClose={closeSearchMenu}
          onOpenAbout={() => setIsAboutOpen(true)}
          onSearchChange={onSearchChange}
          onTabChange={onTabChange}
        />
      ) : null}

      {deckDeleteTarget ? (
        <div className="fixed inset-0 z-[60] bg-[#3b3126]/45 p-4 backdrop-blur-sm">
          <button
            type="button"
            aria-label="Close deck delete confirmation"
            className="absolute inset-0 cursor-default"
            onClick={() => setDeckDeleteTarget(null)}
          />
          <section className="relative mx-auto mt-[18vh] grid w-full max-w-[360px] gap-4 rounded-[20px] border border-[#e8ddcb] bg-[#fffaf0] p-5 text-[#332d25] shadow-[0_24px_70px_rgba(87,72,52,0.28)]">
            <div>
              <h2 className="text-lg font-semibold">このDeckを削除しますか？</h2>
              <p className="mt-2 text-sm font-medium text-[#7d705f]">
                {deckDeleteTarget.name}
              </p>
              <p className="mt-1 text-sm text-[#8d7f6e]">
                対象カード:{" "}
                {isDataReady ? `${cardCountFor(deckDeleteTarget.id)}枚` : "確認中"}
              </p>
            </div>

            <div className="grid gap-2">
              <button
                type="button"
                onClick={() => deleteDeckMovingCards(deckDeleteTarget)}
                className="rounded-full border border-[#d8c8aa] bg-white/72 px-4 py-3 text-sm font-semibold text-[#5f5346] transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-[#d8c8aa]"
              >
                カードを未分類へ移動
              </button>
              <button
                type="button"
                onClick={() => deleteDeckWithCards(deckDeleteTarget)}
                className="rounded-full border border-[#e6c9be] bg-[#fff4ef] px-4 py-3 text-sm font-semibold text-[#9b4b35] transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-[#e6c9be]"
              >
                カードも一緒に削除
              </button>
              <button
                type="button"
                onClick={() => setDeckDeleteTarget(null)}
                className="rounded-full border border-[#e0d3c0] bg-[#fffaf0]/72 px-4 py-3 text-sm font-semibold text-[#7d705f] transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-[#d8c8aa]"
              >
                キャンセル
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {isAboutOpen ? (
        <AboutLifeCardsModal onClose={() => setIsAboutOpen(false)} />
      ) : null}

      {isDeckCreateOpen ? (
        <DeckCreateModal
          onClose={() => setIsDeckCreateOpen(false)}
          onSubmit={handleCreateDeck}
        />
      ) : null}
    </>
  );
}
