"use client";

import Link from "next/link";

import type { Deck } from "@/lib/types";

type Props = {
  canReorder: boolean;
  cardCount: number;
  deck: Deck;
  isActive: boolean;
  isDataReady: boolean;
  isFirstDeck: boolean;
  isLastDeck: boolean;
  onDelete: (deck: Deck) => void;
  onMove: (deckId: string, direction: "up" | "down") => void;
  onSelect: () => void;
};

export default function DeckListItem({
  canReorder,
  cardCount,
  deck,
  isActive,
  isDataReady,
  isFirstDeck,
  isLastDeck,
  onDelete,
  onMove,
  onSelect,
}: Props) {
  const reorderButtonClass = `flex h-8 min-w-8 items-center justify-center rounded-full border px-2 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-[#d8c8aa] disabled:cursor-not-allowed disabled:opacity-35 ${
    isActive
      ? "border-white/24 bg-white/10 text-[#fffaf0] hover:bg-white/18"
      : "border-[#e0d3c0] bg-white/60 text-[#7d705f] hover:bg-white"
  }`;

  return (
    <div
      className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-[14px] border px-4 py-3 text-sm font-semibold transition ${
        isActive
          ? "border-[#2f2a23] bg-[#2f2a23] text-[#fffaf0]"
          : "border-[#e0d3c0] bg-[#fffaf0]/80 text-[#7d705f] hover:bg-white"
      }`}
    >
      <Link href={`/cards/${deck.id}`} onClick={onSelect} className="min-w-0">
        <span className="block truncate">{deck.name}</span>
        <span className="mt-1 block text-xs opacity-70">
          {isDataReady ? `${cardCount} cards` : "読み込み中"}
        </span>
      </Link>
      {canReorder ? (
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label={`${deck.name}を上へ移動`}
            onClick={() => onMove(deck.id, "up")}
            disabled={isFirstDeck}
            className={reorderButtonClass}
          >
            ↑
          </button>
          <button
            type="button"
            aria-label={`${deck.name}を下へ移動`}
            onClick={() => onMove(deck.id, "down")}
            disabled={isLastDeck}
            className={reorderButtonClass}
          >
            ↓
          </button>
          <button
            type="button"
            onClick={() => onDelete(deck)}
            className={`h-8 rounded-full border px-2.5 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-[#d8c8aa] ${
              isActive
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
}
