"use client";

import { useState } from "react";

import type { Card } from "@/lib/types";

type Props = {
  cards: Card[];
};

const gradients = [
  "radial-gradient(circle at 22% 18%, rgba(125, 211, 252, 0.9), transparent 34%), linear-gradient(145deg, #052e16, #111827 72%)",
  "radial-gradient(circle at 28% 20%, rgba(244, 114, 182, 0.9), transparent 34%), linear-gradient(145deg, #312e81, #18181b 78%)",
  "radial-gradient(circle at 24% 18%, rgba(253, 186, 116, 0.88), transparent 34%), linear-gradient(145deg, #7c2d12, #18181b 72%)",
];

function gradientFor(index: number) {
  return gradients[index % gradients.length];
}

function CardTile({
  card,
  index,
  isBack,
  onFlip,
  onOpen,
}: {
  card: Card;
  index: number;
  isBack: boolean;
  onFlip: () => void;
  onOpen: () => void;
}) {
  const hasImage = Boolean(card.imagePath);
  const title = isBack ? card.backText || "No back text" : card.frontText || "Untitled";
  const caption = isBack ? card.frontText : card.backText;

  return (
    <article
      onClick={onFlip}
      className="group relative aspect-[3/4] cursor-pointer overflow-hidden rounded-lg border border-white/12 bg-zinc-900 shadow-xl shadow-black/40 transition duration-200 hover:-translate-y-1 hover:border-white/28 hover:shadow-2xl focus-within:ring-2 focus-within:ring-white focus-within:ring-offset-2 focus-within:ring-offset-black"
      style={!hasImage ? { background: gradientFor(index) } : undefined}
    >
      {hasImage ? (
        <div
          className={`absolute inset-0 bg-cover bg-center transition duration-300 group-hover:scale-[1.03] ${isBack ? "opacity-18 blur-[1px]" : "opacity-100"}`}
          style={{ backgroundImage: `url(${card.imagePath})` }}
        />
      ) : null}
      <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.86),rgba(0,0,0,0.18)_52%,rgba(0,0,0,0.04))]" />
      {isBack ? <div className="absolute inset-0 bg-black/54" /> : null}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_26%_18%,rgba(255,255,255,0.18),transparent_28%)]" />

      <button
        type="button"
        aria-label="Open card detail"
        onClick={(event) => {
          event.stopPropagation();
          onOpen();
        }}
        className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-white/18 bg-black/35 text-lg font-semibold leading-none text-white/75 backdrop-blur transition hover:bg-black/55 hover:text-white focus:outline-none focus:ring-2 focus:ring-white"
      >
        ...
      </button>

      <span className="absolute left-3 top-3 z-10 rounded-full border border-white/18 bg-black/30 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/58 backdrop-blur">
        {isBack ? "back" : "front"}
      </span>

      <div className="relative flex h-full flex-col justify-end p-4">
        <h2 className="text-lg font-semibold leading-tight text-white">
          {title}
        </h2>
        {caption ? (
          <p className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/55">
            {caption}
          </p>
        ) : null}
      </div>
    </article>
  );
}

function ModalCard({
  card,
  index,
}: {
  card: Card;
  index: number;
}) {
  const hasImage = Boolean(card.imagePath);

  return (
    <div className="overflow-hidden rounded-lg border border-white/12 bg-zinc-950 shadow-2xl shadow-black">
      <div className="grid md:grid-cols-[minmax(0,1.05fr)_minmax(280px,0.95fr)]">
        <div
          className="relative min-h-[320px] bg-cover bg-center md:min-h-[560px]"
          style={{
            background: hasImage ? undefined : gradientFor(index),
            backgroundImage: hasImage ? `url(${card.imagePath})` : undefined,
          }}
        >
          <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.42),rgba(0,0,0,0.04))]" />
          {!hasImage ? (
            <div className="absolute bottom-6 left-6 right-6">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/45">
                Life Cards
              </p>
              <h2 className="mt-3 text-3xl font-semibold leading-tight text-white">
                {card.frontText || "Untitled"}
              </h2>
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-5 p-5 sm:p-6">
          <section>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/38">
              Front
            </p>
            <h2 className="mt-3 text-3xl font-semibold leading-tight text-white">
              {card.frontText || "Untitled"}
            </h2>
          </section>

          <section className="rounded-lg border border-white/10 bg-white/6 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/38">
              Back
            </p>
            <p className="mt-3 text-base leading-7 text-white/78">
              {card.backText || "No back text"}
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

export default function TradingCardGrid({ cards }: Props) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [flippedIds, setFlippedIds] = useState<Set<string>>(new Set());
  const selectedCard = selectedIndex === null ? null : cards[selectedIndex];
  const hasMultipleCards = cards.length > 1;

  function showCard(nextIndex: number) {
    const boundedIndex = (nextIndex + cards.length) % cards.length;
    setSelectedIndex(boundedIndex);
  }

  function showPrevious() {
    if (hasMultipleCards && selectedIndex !== null) {
      showCard(selectedIndex - 1);
    }
  }

  function showNext() {
    if (hasMultipleCards && selectedIndex !== null) {
      showCard(selectedIndex + 1);
    }
  }

  function toggleCard(cardId: string) {
    setFlippedIds((current) => {
      const next = new Set(current);

      if (next.has(cardId)) {
        next.delete(cardId);
      } else {
        next.add(cardId);
      }

      return next;
    });
  }

  if (cards.length === 0) {
    return (
      <div className="rounded-lg border border-white/10 bg-white/5 p-8 text-sm text-white/55">
        No cards yet.
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
        {cards.map((card, index) => (
          <CardTile
            key={card.id}
            card={card}
            index={index}
            isBack={flippedIds.has(card.id)}
            onFlip={() => toggleCard(card.id)}
            onOpen={() => setSelectedIndex(index)}
          />
        ))}
      </div>

      {selectedCard && selectedIndex !== null ? (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/84 px-4 py-6 backdrop-blur-md sm:px-6">
          <button
            type="button"
            aria-label="Close card preview"
            className="fixed inset-0 cursor-default"
            onClick={() => setSelectedIndex(null)}
          />

          <div className="relative mx-auto flex min-h-full max-w-5xl items-center">
            <button
              type="button"
              onClick={showPrevious}
              disabled={!hasMultipleCards}
              aria-label="Previous card"
              className="fixed left-3 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/55 text-2xl font-light text-white/75 transition hover:bg-white/12 hover:text-white disabled:opacity-25 sm:left-6"
            >
              ‹
            </button>

            <div className="relative w-full">
              <ModalCard card={selectedCard} index={selectedIndex} />
              <button
                type="button"
                onClick={() => setSelectedIndex(null)}
                className="mx-auto mt-5 block rounded-full border border-white/15 bg-white/8 px-5 py-2 text-sm font-semibold text-white/75 transition hover:bg-white/12 hover:text-white"
              >
                Close
              </button>
            </div>

            <button
              type="button"
              onClick={showNext}
              disabled={!hasMultipleCards}
              aria-label="Next card"
              className="fixed right-3 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/55 text-2xl font-light text-white/75 transition hover:bg-white/12 hover:text-white disabled:opacity-25 sm:right-6"
            >
              ›
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
