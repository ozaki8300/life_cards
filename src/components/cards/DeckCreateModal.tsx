"use client";

import type { FormEvent } from "react";

import { useEscapeKey } from "@/lib/useEscapeKey";

type Props = {
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export default function DeckCreateModal({ onClose, onSubmit }: Props) {
  useEscapeKey(onClose, { ignoreEditable: false });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#3b3126]/40 px-4 backdrop-blur-sm">
      <button
        type="button"
        aria-label="Close deck dialog"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />
      <form
        onSubmit={onSubmit}
        className="relative w-full max-w-sm rounded-[20px] border border-[#e8ddcb] bg-[#fffaf0] p-5 shadow-[0_24px_70px_rgba(87,72,52,0.28)]"
      >
        <h2 className="text-lg font-bold text-[#332d25]">New Deck</h2>
        <label className="mt-5 block">
          <input
            name="deckName"
            aria-label="Deck name"
            placeholder="Deck name"
            className="w-full rounded-[14px] border border-[#e8ddcb] bg-white/72 px-4 py-3 text-sm font-semibold text-[#332d25] outline-none placeholder:text-[#a19380] focus:ring-2 focus:ring-[#e8ddcb]"
          />
        </label>
        <div className="mt-5 flex gap-3">
          <button
            type="submit"
            className="flex-1 rounded-full bg-[#2f2a23] px-4 py-2 text-sm font-semibold text-[#fffaf0]"
          >
            Create
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-full border border-[#e0d3c0] bg-white/72 px-4 py-2 text-sm font-semibold text-[#7d705f]"
          >
            Close
          </button>
        </div>
      </form>
    </div>
  );
}
