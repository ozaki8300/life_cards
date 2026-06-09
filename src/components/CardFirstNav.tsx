"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";

import { CardRepository } from "@/lib/cardRepository";
import { DeckRepository } from "@/lib/deckRepository";
import { EncounterRepository } from "@/lib/encounterRepository";
import type { Card, Deck } from "@/lib/types";
import { useEscapeKey } from "@/lib/useEscapeKey";

import AboutLifeCardsModal from "./AboutLifeCardsModal";
import AuthStatus from "./auth/AuthStatus";
import DeckCreateModal from "./cards/DeckCreateModal";
import { todayInputValue } from "./cards/cardFormUtils";

const tabs = ["すべて", "お気に入り"];

type Props = {
  activeDeckId?: string;
  activeTab?: string;
  cards: Card[];
  decks: Deck[];
  searchQuery?: string;
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
  searchQuery = "",
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
    const nextDecks = await DeckRepository.saveDeckForCurrentUser(
      nextDeck,
      decks,
    );

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

    return DeckRepository.saveDeckForCurrentUser(
      {
        id: "uncategorized",
        name: "未分類",
        cardCount: 0,
        isShared: false,
        createdAt: todayInputValue(),
      },
      deckList,
    );
  }

  async function deleteDeckMovingCards(deck: Deck) {
    const decksWithUncategorized = await ensureUncategorizedDeck(decks);
    const nextCards = await CardRepository.moveCardsToDeckForCurrentUser(
      deck.id,
      "uncategorized",
      cards,
    );
    const nextDecks = await DeckRepository.deleteDeckForCurrentUser(
      deck.id,
      decksWithUncategorized,
    );

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

    const nextDecks = await DeckRepository.deleteDeckForCurrentUser(
      deck.id,
      decks,
    );

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

  const displayButtons = (
    <div className="space-y-2">
      {tabs.map((tab) => (
        <button
          key={tab}
          type="button"
          onClick={() => onTabChange?.(tab)}
          className={`block w-full rounded-[14px] border px-4 py-3 text-left text-sm font-semibold transition ${
            activeTab === tab
              ? "border-[#2f2a23] bg-[#2f2a23] text-[#fffaf0]"
              : "border-[#e0d3c0] bg-[#fffaf0]/80 text-[#7d705f] hover:bg-white"
          }`}
        >
          {tab}
        </button>
      ))}
    </div>
  );

  useEscapeKey(() => setIsDeckPanelOpen(false), {
    enabled: isDeckPanelOpen,
    ignoreEditable: false,
  });
  useEscapeKey(() => setDeckDeleteTarget(null), {
    enabled: Boolean(deckDeleteTarget),
    ignoreEditable: false,
  });
  useEscapeKey(() => setIsMenuOpen(false), {
    enabled: isMenuOpen,
    ignoreEditable: false,
  });
  return (
    <>
      <div className="fixed right-3 top-[calc(env(safe-area-inset-top)+1rem)] z-40 flex max-w-[calc(100vw-1.5rem)] items-center justify-end gap-1.5 sm:right-8 sm:top-8 sm:gap-2 lg:right-12 xl:right-[calc((100vw-72rem)/2+3rem)]">
        <AuthStatus />
        <button
          type="button"
          onClick={() => setIsDeckPanelOpen(true)}
          aria-label="Open decks"
          className="inline-flex h-10 items-center justify-center rounded-full border border-[#e0d3c0] bg-[#fffaf0]/88 px-3 text-xs font-semibold text-[#5f5346] shadow-sm backdrop-blur transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-[#d8c8aa] focus:ring-offset-2 focus:ring-offset-[#f7f3ea] sm:h-11 sm:px-4 sm:text-sm"
        >
          Decks
        </button>
        <button
          type="button"
          onClick={() => setIsMenuOpen(true)}
          aria-label="Open menu"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#e0d3c0] bg-[#fffaf0]/88 text-xl leading-none text-[#5f5346] shadow-sm backdrop-blur transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-[#d8c8aa] focus:ring-offset-2 focus:ring-offset-[#f7f3ea] sm:h-11 sm:w-11 sm:text-2xl"
        >
          ☰
        </button>
      </div>

      {children}

      {isDeckPanelOpen ? (
        <div className="fixed inset-0 z-50 bg-[#3b3126]/40 p-4 backdrop-blur-sm">
          <button
            type="button"
            aria-label="Close deck panel"
            className="absolute inset-0 cursor-default"
            onClick={() => setIsDeckPanelOpen(false)}
          />
          <aside className="relative flex h-full max-w-[360px] flex-col rounded-[22px] border border-[#e8ddcb] bg-[#fffaf0] p-4 shadow-[0_24px_70px_rgba(87,72,52,0.28)]">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-[#332d25]">Decks</h2>
              <button
                type="button"
                onClick={() => setIsDeckPanelOpen(false)}
                className="rounded-full border border-[#e0d3c0] bg-white/72 px-3 py-1 text-sm font-semibold text-[#7d705f]"
              >
                閉じる
              </button>
            </div>
            <input
              type="search"
              value={deckSearchQuery}
              onChange={(event) => setDeckSearchQuery(event.target.value)}
              placeholder="Deckを検索"
              className="mt-4 w-full rounded-[12px] border border-[#e8ddcb] bg-white/72 px-3 py-2 text-sm text-[#332d25] outline-none placeholder:text-[#a19380] focus:ring-2 focus:ring-[#e8ddcb]"
            />

            <div className="mt-3 min-h-0 flex-1 overflow-y-auto pr-1">
              <div className="grid gap-2">
                <Link
                  href="/cards"
                  onClick={() => setIsDeckPanelOpen(false)}
                  className={`rounded-[14px] border px-4 py-3 text-sm font-semibold transition ${
                    activeDeckId
                      ? "border-[#e0d3c0] bg-[#fffaf0]/80 text-[#7d705f] hover:bg-white"
                      : "border-[#2f2a23] bg-[#2f2a23] text-[#fffaf0]"
                  }`}
                >
                  <span className="block">すべて</span>
                  <span className="mt-1 block text-xs opacity-70">
                    {cards.length} cards
                  </span>
                </Link>

                {filteredDecks.length > 0 ? (
                  filteredDecks.map((deck) => {
                    const deckIndex = reorderableDecks.findIndex(
                      (item) => item.id === deck.id,
                    );
                    const canReorder = deck.id !== "uncategorized";
                    const isFirstDeck = deckIndex === 0;
                    const isLastDeck =
                      deckIndex === reorderableDecks.length - 1;
                    const isActiveDeck = activeDeckId === deck.id;
                    const reorderButtonClass = `flex h-8 min-w-8 items-center justify-center rounded-full border px-2 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-[#d8c8aa] disabled:cursor-not-allowed disabled:opacity-35 ${
                      isActiveDeck
                        ? "border-white/24 bg-white/10 text-[#fffaf0] hover:bg-white/18"
                        : "border-[#e0d3c0] bg-white/60 text-[#7d705f] hover:bg-white"
                    }`;

                    return (
                      <div
                        key={deck.id}
                        className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-[14px] border px-4 py-3 text-sm font-semibold transition ${
                          isActiveDeck
                            ? "border-[#2f2a23] bg-[#2f2a23] text-[#fffaf0]"
                            : "border-[#e0d3c0] bg-[#fffaf0]/80 text-[#7d705f] hover:bg-white"
                        }`}
                      >
                        <Link
                          href={`/cards/${deck.id}`}
                          onClick={() => setIsDeckPanelOpen(false)}
                          className="min-w-0"
                        >
                          <span className="block truncate">{deck.name}</span>
                          <span className="mt-1 block text-xs opacity-70">
                            {cardCountFor(deck.id)} cards
                          </span>
                        </Link>
                        {canReorder ? (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              aria-label={`${deck.name}を上へ移動`}
                              onClick={() => moveDeck(deck.id, "up")}
                              disabled={isFirstDeck}
                              className={reorderButtonClass}
                            >
                              ↑
                            </button>
                            <button
                              type="button"
                              aria-label={`${deck.name}を下へ移動`}
                              onClick={() => moveDeck(deck.id, "down")}
                              disabled={isLastDeck}
                              className={reorderButtonClass}
                            >
                              ↓
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeckDeleteTarget(deck)}
                              className={`h-8 rounded-full border px-2.5 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-[#d8c8aa] ${
                                isActiveDeck
                                  ? "border-white/28 bg-white/12 text-[#fffaf0] hover:bg-white/20"
                                  : "border-[#e6c9be] bg-[#fff4ef] text-[#9b4b35] hover:bg-white"
                              }`}
                            >
                              削除
                            </button>
                          </div>
                        ) : null}
                      </div>
                    );
                  })
                ) : (
                  <p className="rounded-[14px] border border-dashed border-[#d8c8aa] bg-white/56 px-4 py-4 text-sm font-semibold text-[#8d7f6e]">
                    該当するDeckがありません
                  </p>
                )}
              </div>
            </div>

            <div className="mt-3 border-t border-[#eadfce] pt-3">
              <button
                type="button"
                onClick={() => setIsDeckCreateOpen(true)}
                className="w-full rounded-[14px] border border-dashed border-[#d8c8aa] bg-white/56 px-4 py-3 text-left text-sm font-semibold text-[#7d705f] transition hover:bg-white"
              >
                ＋ 新しいDeck
              </button>
            </div>
          </aside>
        </div>
      ) : null}

      {isMenuOpen ? (
        <div className="fixed inset-0 z-50 bg-[#3b3126]/40 p-4 backdrop-blur-sm">
          <button
            type="button"
            aria-label="Close deck menu"
            className="absolute inset-0 cursor-default"
            onClick={() => setIsMenuOpen(false)}
          />
          <aside className="relative h-full max-w-[340px] rounded-[22px] border border-[#e8ddcb] bg-[#fffaf0] p-4 shadow-[0_24px_70px_rgba(87,72,52,0.28)]">
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#a19380]">
                  検索
                </p>
                <button
                  type="button"
                  onClick={() => setIsMenuOpen(false)}
                  className="rounded-full border border-[#e0d3c0] bg-white/72 px-3 py-1 text-sm font-semibold text-[#7d705f]"
                >
                  閉じる
                </button>
              </div>
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => onSearchChange?.(event.target.value)}
                placeholder="カードを検索（AND検索）"
                className="mt-4 w-full rounded-[12px] border border-[#e8ddcb] bg-white/72 px-3 py-2 text-sm text-[#332d25] outline-none placeholder:text-[#a19380] focus:ring-2 focus:ring-[#e8ddcb]"
              />
              <div className="mt-6">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#a19380]">
                  表示
                </p>
                <div className="mt-3">{displayButtons}</div>
              </div>

              <div className="mt-auto border-t border-[#eadfce] pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    setIsAboutOpen(true);
                  }}
                  className="w-full rounded-[14px] border border-[#e0d3c0] bg-white/72 px-4 py-3 text-left text-sm font-semibold text-[#5f5346] transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-[#d8c8aa]"
                >
                  About Life Cards
                </button>
              </div>
            </div>
          </aside>
        </div>
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
                対象カード: {cardCountFor(deckDeleteTarget.id)}枚
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
