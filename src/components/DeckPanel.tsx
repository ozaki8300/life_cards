"use client";

import Link from "next/link";

import type { Deck } from "@/lib/types";

import DeckListItem from "./DeckListItem";

type Props = {
  activeDeckId?: string;
  allCardsCount: number;
  cardCountFor: (deckId: string) => number;
  deckSearchQuery: string;
  filteredDecks: Deck[];
  isDataReady: boolean;
  onClose: () => void;
  onCreateDeck: () => void;
  onDeleteDeck: (deck: Deck) => void;
  onMoveDeck: (deckId: string, direction: "up" | "down") => void;
  onSearchChange: (query: string) => void;
  reorderableDecks: Deck[];
};

export default function DeckPanel({
  activeDeckId,
  allCardsCount,
  cardCountFor,
  deckSearchQuery,
  filteredDecks,
  isDataReady,
  onClose,
  onCreateDeck,
  onDeleteDeck,
  onMoveDeck,
  onSearchChange,
  reorderableDecks,
}: Props) {
  return (
    <div className="fixed inset-0 z-50 bg-[#3b3126]/40 p-4 backdrop-blur-sm">
      <button
        type="button"
        aria-label="Close deck panel"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />
      <aside className="relative flex h-full max-w-[360px] flex-col rounded-[22px] border border-[#e8ddcb] bg-[#fffaf0] p-4 shadow-[0_24px_70px_rgba(87,72,52,0.28)]">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-[#332d25]">Decks</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-[#e0d3c0] bg-white/72 px-3 py-1 text-sm font-semibold text-[#7d705f]"
          >
            閉じる
          </button>
        </div>
        <input
          type="search"
          value={deckSearchQuery}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Deckを検索"
          className="mt-4 w-full rounded-[12px] border border-[#e8ddcb] bg-white/72 px-3 py-2 text-sm text-[#332d25] outline-none placeholder:text-[#a19380] focus:ring-2 focus:ring-[#e8ddcb]"
        />

        <div className="mt-3 min-h-0 flex-1 overflow-y-auto pr-1">
          <div className="grid gap-2">
            <Link
              href="/cards"
              onClick={onClose}
              className={`rounded-[14px] border px-4 py-3 text-sm font-semibold transition ${
                activeDeckId
                  ? "border-[#e0d3c0] bg-[#fffaf0]/80 text-[#7d705f] hover:bg-white"
                  : "border-[#2f2a23] bg-[#2f2a23] text-[#fffaf0]"
              }`}
            >
              <span className="block">すべて</span>
              <span className="mt-1 block text-xs opacity-70">
                {isDataReady ? `${allCardsCount} cards` : "読み込み中"}
              </span>
            </Link>

            {filteredDecks.length > 0 ? (
              filteredDecks.map((deck) => {
                const deckIndex = reorderableDecks.findIndex(
                  (item) => item.id === deck.id,
                );
                const canReorder = deck.id !== "uncategorized";
                const isFirstDeck = deckIndex === 0;
                const isLastDeck = deckIndex === reorderableDecks.length - 1;

                return (
                  <DeckListItem
                    key={deck.id}
                    canReorder={canReorder}
                    cardCount={cardCountFor(deck.id)}
                    deck={deck}
                    isActive={activeDeckId === deck.id}
                    isDataReady={isDataReady}
                    isFirstDeck={isFirstDeck}
                    isLastDeck={isLastDeck}
                    onDelete={onDeleteDeck}
                    onMove={onMoveDeck}
                    onSelect={onClose}
                  />
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
            onClick={onCreateDeck}
            className="w-full rounded-[14px] border border-dashed border-[#d8c8aa] bg-white/56 px-4 py-3 text-left text-sm font-semibold text-[#7d705f] transition hover:bg-white"
          >
            ＋ 新しいDeck
          </button>
        </div>
      </aside>
    </div>
  );
}
