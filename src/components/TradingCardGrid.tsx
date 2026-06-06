"use client";

import { useState } from "react";

import type { Card } from "@/lib/types";

type Props = {
  cards: Card[];
};

const accents = [
  "from-sky-300/70 via-teal-500/35 to-zinc-950",
  "from-rose-300/75 via-fuchsia-600/35 to-zinc-950",
  "from-amber-200/75 via-orange-700/35 to-zinc-950",
];

function TradingCard({
  card,
  index,
  isLarge = false,
  isBack = false,
}: {
  card: Card;
  index: number;
  isLarge?: boolean;
  isBack?: boolean;
}) {
  const accent = accents[index % accents.length];
  const title = isBack ? card.backText || "No back text" : card.frontText || "Untitled";
  const caption = isBack ? card.frontText : card.backText;
  const hasImage = Boolean(card.imagePath);

  return (
    <article className="group relative aspect-[3/4] rounded-lg">
      <div className="absolute inset-x-2 top-2 h-full rounded-lg border border-white/10 bg-zinc-800/80 shadow-xl shadow-black/40 transition group-hover:translate-y-1" />
      <div className="absolute inset-x-1 top-1 h-full rounded-lg border border-white/10 bg-zinc-700/80 shadow-xl shadow-black/40 transition group-hover:translate-y-0.5" />

      <div
        className={`relative flex h-full flex-col justify-between overflow-hidden rounded-lg border border-white/15 bg-gradient-to-br ${accent} p-3 shadow-2xl shadow-black/50 transition duration-200 group-hover:-translate-y-1 group-hover:border-white/30 sm:p-4 ${isLarge ? "p-5 sm:p-6" : ""}`}
      >
        {hasImage ? (
          <div
            className={`absolute inset-0 bg-cover bg-center ${isBack ? "opacity-18 blur-[1px]" : "opacity-100"}`}
            style={{ backgroundImage: `url(${card.imagePath})` }}
          />
        ) : null}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_24%_16%,rgba(255,255,255,0.24),transparent_30%),linear-gradient(to_top,rgba(0,0,0,0.82),rgba(0,0,0,0.08))]" />
        {isBack ? (
          <div className="absolute inset-0 bg-black/54" />
        ) : null}
        <div className="absolute inset-x-4 top-4 h-px bg-white/30" />
        <div className="absolute inset-y-4 right-4 w-px bg-white/20" />

        <div className="relative flex items-start justify-between">
          {hasImage && !isBack ? (
            <div className={`${isLarge ? "h-24 w-24" : "h-16 w-16"} rounded-md border border-white/20 bg-white/14 bg-cover bg-center shadow-lg shadow-black/30 backdrop-blur`}
              style={{ backgroundImage: `url(${card.imagePath})` }}
            />
          ) : (
            <div className={`${isLarge ? "h-16 w-16" : "h-12 w-12"} rounded-md border border-white/20 bg-white/12 backdrop-blur`} />
          )}
          <span className="rounded-full border border-white/20 bg-black/30 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/65">
            {isBack ? "back" : "front"}
          </span>
        </div>

        <div className={`relative ${hasImage && !isBack ? "rounded-md bg-black/34 p-3 backdrop-blur-sm" : ""}`}>
          <h2 className={`${isLarge ? "text-2xl sm:text-3xl" : "text-base sm:text-lg"} font-semibold leading-tight text-white`}>
            {title}
          </h2>
          {caption ? (
            <p className={`${isLarge ? "mt-4" : "mt-2"} text-xs font-medium uppercase tracking-[0.18em] text-white/55`}>
              {caption}
            </p>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export default function TradingCardGrid({ cards }: Props) {
  const [selected, setSelected] = useState<{ card: Card; index: number } | null>(null);
  const [isBack, setIsBack] = useState(false);

  function openCard(card: Card, index: number) {
    setSelected({ card, index });
    setIsBack(false);
  }

  function closeCard() {
    setSelected(null);
    setIsBack(false);
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-4 sm:gap-5 md:grid-cols-4">
        {cards.map((card, index) => (
          <button
            key={card.id}
            type="button"
            onClick={() => openCard(card, index)}
            className="block text-left focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-black"
          >
            <TradingCard card={card} index={index} />
          </button>
        ))}
      </div>

      {selected ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/82 px-5 py-8 backdrop-blur-md">
          <button
            type="button"
            aria-label="Close card preview"
            className="absolute inset-0 cursor-default"
            onClick={closeCard}
          />
          <div className="relative w-full max-w-[360px]">
            <button
              type="button"
              onClick={() => setIsBack((current) => !current)}
              className="block w-full text-left focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-black"
            >
              <TradingCard
                card={selected.card}
                index={selected.index}
                isLarge
                isBack={isBack}
              />
            </button>
            <button
              type="button"
              onClick={closeCard}
              className="mt-5 w-full rounded-full border border-white/15 bg-white/8 px-4 py-3 text-sm font-semibold text-white/75 transition hover:bg-white/12 hover:text-white"
            >
              Close
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
