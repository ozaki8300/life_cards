"use client";

import Link from "next/link";
import { useState } from "react";

import type { Deck } from "@/lib/types";

const tabs = ["すべて", "お気に入り", "最近追加", "忘却対象"];

type Props = {
  decks: Deck[];
  activeDeckId?: string;
  activeTab?: string;
  searchQuery?: string;
  onTabChange?: (tab: string) => void;
  onSearchChange?: (query: string) => void;
  children: React.ReactNode;
};

export default function CardFirstNav({
  decks,
  activeDeckId,
  activeTab = "すべて",
  searchQuery = "",
  onTabChange,
  onSearchChange,
  children,
}: Props) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  function createDeckDraft() {
    console.log("Life Cards deck draft");
    alert("デッキ作成はまだ仮実装です。");
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

  const deckLinks = (
    <div className="space-y-2">
      <Link
        href="/cards"
        onClick={() => setIsMenuOpen(false)}
        className={`block rounded-[14px] border px-4 py-3 text-sm font-semibold transition ${
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
          onClick={() => setIsMenuOpen(false)}
          className={`block rounded-[14px] border px-4 py-3 text-sm font-semibold transition ${
            activeDeckId === deck.id
              ? "border-[#2f2a23] bg-[#2f2a23] text-[#fffaf0]"
              : "border-[#e0d3c0] bg-[#fffaf0]/80 text-[#7d705f] hover:bg-white"
          }`}
        >
          {deck.name}
        </Link>
      ))}
      <button
        type="button"
        onClick={createDeckDraft}
        className="block w-full rounded-[14px] border border-dashed border-[#d8c8aa] bg-white/56 px-4 py-3 text-left text-sm font-semibold text-[#7d705f] transition hover:bg-white"
      >
        ＋ 新しいデッキ
      </button>
    </div>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setIsMenuOpen(true)}
        aria-label="Open menu"
        className="fixed right-5 top-8 z-40 inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#e0d3c0] bg-[#fffaf0]/88 text-2xl leading-none text-[#5f5346] shadow-sm backdrop-blur transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-[#d8c8aa] focus:ring-offset-2 focus:ring-offset-[#f7f3ea] sm:right-8 lg:right-12 xl:right-[calc((100vw-72rem)/2+3rem)]"
      >
        ☰
      </button>

      {children}

      {isMenuOpen ? (
        <div className="fixed inset-0 z-50 bg-[#3b3126]/40 p-4 backdrop-blur-sm">
          <button
            type="button"
            aria-label="Close deck menu"
            className="absolute inset-0 cursor-default"
            onClick={() => setIsMenuOpen(false)}
          />
          <aside className="relative h-full max-w-[340px] rounded-[22px] border border-[#e8ddcb] bg-[#fffaf0] p-4 shadow-[0_24px_70px_rgba(87,72,52,0.28)]">
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
            <div className="mt-6">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#a19380]">
                分類
              </p>
              <div className="mt-3 max-h-[calc(100vh-430px)] overflow-y-auto">
                {deckLinks}
              </div>
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}
