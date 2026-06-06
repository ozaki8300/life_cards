"use client";

import { useState } from "react";

import type { Card } from "@/lib/types";

type Props = {
  cards: Card[];
};

const gradients = [
  "linear-gradient(145deg, #fffaf0 0%, #f3eadc 100%)",
  "linear-gradient(145deg, #fff8ea 0%, #edf4eb 100%)",
  "linear-gradient(145deg, #fff7ec 0%, #f4eddf 100%)",
];

function gradientFor(index: number) {
  return gradients[index % gradients.length];
}

function formatDate(date: string) {
  return date.replaceAll("-", ".");
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
  const date = formatDate(card.createdAt);

  return (
    <article
      onClick={onFlip}
      className="group relative aspect-[3/4] cursor-pointer overflow-hidden rounded-[14px] border border-[#e8ddcb] bg-[#fffaf0] p-3 shadow-[0_14px_34px_rgba(122,105,82,0.16)] transition duration-200 hover:-translate-y-1 hover:shadow-[0_18px_42px_rgba(122,105,82,0.22)] focus-within:ring-2 focus-within:ring-[#2f2a23] focus-within:ring-offset-2 focus-within:ring-offset-[#f7f3ea]"
      style={!hasImage ? { background: gradientFor(index) } : undefined}
    >
      {hasImage && isBack ? (
        <div
          className="absolute inset-0 bg-cover bg-center opacity-15 blur-[1px]"
          style={{ backgroundImage: `url(${card.imagePath})` }}
        />
      ) : null}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.28),transparent_38%,rgba(88,72,52,0.035))]" />

      <button
        type="button"
        aria-label="Open card detail"
        onClick={(event) => {
          event.stopPropagation();
          onOpen();
        }}
        className="absolute right-5 top-5 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-[#e0d3c0] bg-[#fffaf0]/88 text-lg font-semibold leading-none text-[#7d705f] shadow-sm backdrop-blur transition hover:bg-white hover:text-[#2f2a23] focus:outline-none focus:ring-2 focus:ring-[#2f2a23]"
      >
        ...
      </button>

      <span className="absolute left-5 top-5 z-10 rounded-full border border-[#e0d3c0] bg-[#fffaf0]/88 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8d7f6e] backdrop-blur">
        {isBack ? "back" : "front"}
      </span>

      {isBack ? (
        <div className="relative flex h-full flex-col justify-center rounded-[10px] border border-[#eadfce]/70 bg-[#fffaf0]/86 px-4 py-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#a19380]">
            Memo
          </p>
          <h2 className="mt-4 text-lg font-semibold leading-relaxed text-[#332d25]">
            {title}
          </h2>
          {caption ? (
            <p className="mt-4 line-clamp-3 text-xs leading-5 text-[#8d7f6e]">
              {caption}
            </p>
          ) : null}
          <p className="mt-5 text-[11px] font-medium text-[#a19380]">
            {date}
          </p>
        </div>
      ) : (
        <div className="relative flex h-full flex-col">
          {hasImage ? (
            <div
              className="h-[62%] rounded-[8px] bg-cover bg-center shadow-inner shadow-[#9c8f7c]/20 transition duration-300 group-hover:scale-[1.01]"
              style={{ backgroundImage: `url(${card.imagePath})` }}
            />
          ) : (
            <div className="flex h-[62%] items-center justify-center rounded-[8px] border border-[#eadfce]/70 bg-[#fffaf0]/42 px-4 text-center">
              <p className="text-xl font-semibold leading-snug text-[#332d25]">
                {title}
              </p>
            </div>
          )}

          <div className="flex flex-1 flex-col justify-between pt-4">
            <h2 className="line-clamp-3 text-base font-semibold leading-snug text-[#332d25]">
              {title}
            </h2>
            <div>
              {caption ? (
                <p className="mt-3 line-clamp-1 text-xs leading-5 text-[#8d7f6e]">
                  {caption}
                </p>
              ) : null}
              <p className="mt-2 text-[11px] font-medium text-[#a19380]">
                {date}
              </p>
            </div>
          </div>
        </div>
      )}
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
    <div className="overflow-hidden rounded-[16px] border border-[#e8ddcb] bg-[#fffaf0] shadow-[0_28px_80px_rgba(87,72,52,0.28)]">
      <div className="grid md:grid-cols-[minmax(0,1.05fr)_minmax(280px,0.95fr)]">
        <div
          className="relative min-h-[320px] bg-cover bg-center p-4 md:min-h-[560px]"
          style={{
            background: hasImage ? undefined : gradientFor(index),
            backgroundImage: hasImage ? `url(${card.imagePath})` : undefined,
          }}
        >
          <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(255,250,240,0.2),rgba(255,250,240,0.02))]" />
          {!hasImage ? (
            <div className="absolute bottom-6 left-6 right-6 rounded-[10px] border border-[#eadfce]/70 bg-[#fffaf0]/72 p-5 backdrop-blur">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#a19380]">
                Life Cards
              </p>
              <h2 className="mt-3 text-3xl font-semibold leading-tight text-[#332d25]">
                {card.frontText || "Untitled"}
              </h2>
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-5 p-5 sm:p-6">
          <p className="w-fit rounded-full border border-[#e0d3c0] bg-[#f8f0e3] px-3 py-1 text-[11px] font-semibold tracking-[0.16em] text-[#8d7f6e]">
            {formatDate(card.createdAt)}
          </p>

          <section>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#a19380]">
              Front
            </p>
            <h2 className="mt-3 text-3xl font-semibold leading-tight text-[#332d25]">
              {card.frontText || "Untitled"}
            </h2>
          </section>

          <section className="rounded-[10px] border border-[#e8ddcb] bg-[#f8f0e3] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#a19380]">
              Back
            </p>
            <p className="mt-3 text-base leading-7 text-[#5f5346]">
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
      <div className="rounded-[12px] border border-[#e8ddcb] bg-[#fffaf0] p-8 text-sm text-[#8d7f6e] shadow-lg shadow-[#d7cab8]">
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
        <div className="fixed inset-0 z-50 overflow-y-auto bg-[#3b3126]/45 px-4 py-6 backdrop-blur-md sm:px-6">
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
              className="fixed left-3 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-[#e0d3c0] bg-[#fffaf0]/88 text-2xl font-light text-[#7d705f] shadow-lg transition hover:bg-white hover:text-[#2f2a23] disabled:opacity-25 sm:left-6"
            >
              ‹
            </button>

            <div className="relative w-full">
              <ModalCard card={selectedCard} index={selectedIndex} />
              <button
                type="button"
                onClick={() => setSelectedIndex(null)}
                className="mx-auto mt-5 block rounded-full border border-[#e0d3c0] bg-[#fffaf0]/90 px-5 py-2 text-sm font-semibold text-[#7d705f] shadow-md transition hover:bg-white hover:text-[#2f2a23]"
              >
                Close
              </button>
            </div>

            <button
              type="button"
              onClick={showNext}
              disabled={!hasMultipleCards}
              aria-label="Next card"
              className="fixed right-3 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-[#e0d3c0] bg-[#fffaf0]/88 text-2xl font-light text-[#7d705f] shadow-lg transition hover:bg-white hover:text-[#2f2a23] disabled:opacity-25 sm:right-6"
            >
              ›
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
