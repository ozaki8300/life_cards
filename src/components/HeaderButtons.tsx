"use client";

import AuthStatus from "./auth/AuthStatus";

type Props = {
  onOpenDecks: () => void;
  onOpenMenu: () => void;
};

export default function HeaderButtons({ onOpenDecks, onOpenMenu }: Props) {
  return (
    <div className="static flex max-w-full shrink-0 items-center justify-end gap-1.5 sm:gap-2 lg:fixed lg:right-12 lg:top-8 lg:z-40 lg:max-w-[calc(100vw-1.5rem)] xl:right-[calc((100vw-72rem)/2+3rem)]">
      <AuthStatus />
      <button
        type="button"
        onClick={onOpenDecks}
        aria-label="Open decks"
        className="inline-flex h-10 items-center justify-center rounded-full border border-[#e0d3c0] bg-[#fffaf0]/88 px-3 text-xs font-semibold text-[#5f5346] shadow-sm backdrop-blur transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-[#d8c8aa] focus:ring-offset-2 focus:ring-offset-[#f7f3ea] sm:h-11 sm:px-4 sm:text-sm"
      >
        Decks
      </button>
      <button
        type="button"
        onClick={onOpenMenu}
        aria-label="Open menu"
        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#e0d3c0] bg-[#fffaf0]/88 text-xl leading-none text-[#5f5346] shadow-sm backdrop-blur transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-[#d8c8aa] focus:ring-offset-2 focus:ring-offset-[#f7f3ea] sm:h-11 sm:w-11 sm:text-2xl"
      >
        ☰
      </button>
    </div>
  );
}
