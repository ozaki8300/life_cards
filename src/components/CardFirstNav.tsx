import Link from "next/link";

import type { Deck } from "@/lib/types";

const tabs = ["すべて", "お気に入り", "最近追加", "忘却対象"];

type Props = {
  decks: Deck[];
  activeDeckId?: string;
};

export default function CardFirstNav({ decks, activeDeckId }: Props) {
  return (
    <div className="mb-7 space-y-4">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map((tab, index) => (
          <button
            key={tab}
            type="button"
            className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition ${
              index === 0
                ? "border-[#2f2a23] bg-[#2f2a23] text-[#fffaf0]"
                : "border-[#e0d3c0] bg-[#fffaf0]/80 text-[#7d705f] hover:bg-white"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        <Link
          href="/cards"
          className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition ${
            activeDeckId
              ? "border-[#e0d3c0] bg-[#fffaf0]/80 text-[#7d705f] hover:bg-white"
              : "border-[#2f2a23] bg-[#2f2a23] text-[#fffaf0]"
          }`}
        >
          すべて
        </Link>

        {decks.map((deck) => (
          <Link
            key={deck.id}
            href={`/cards/${deck.id}`}
            className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition ${
              activeDeckId === deck.id
                ? "border-[#2f2a23] bg-[#2f2a23] text-[#fffaf0]"
                : "border-[#e0d3c0] bg-[#fffaf0]/80 text-[#7d705f] hover:bg-white"
            }`}
          >
            {deck.name}
          </Link>
        ))}
      </div>
    </div>
  );
}
