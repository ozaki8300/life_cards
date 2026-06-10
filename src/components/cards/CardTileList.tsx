"use client";

import type { Card } from "@/lib/types";

import CardTile from "./CardTile";

const RAIL_ITEM_CLASS =
  "w-[min(22rem,calc(100vw-2.5rem))] shrink-0 snap-start overflow-hidden rounded-[18px] [contain:paint] sm:w-[calc((100%-2.5rem)/3)] lg:w-[calc((100%-3.75rem)/4)] xl:w-[calc((100%-5rem)/5)]";

type Props = {
  activeFavoriteIds: Set<string>;
  cards: Card[];
  deckLabelFor: (card: Card) => string;
  flippedIds: Set<string>;
  layout: "grid" | "rail";
  onFlip: (cardId: string) => void;
  onOpen: (index: number) => void;
  onToggleFavorite: (cardId: string) => void;
};

export default function CardTileList({
  activeFavoriteIds,
  cards,
  deckLabelFor,
  flippedIds,
  layout,
  onFlip,
  onOpen,
  onToggleFavorite,
}: Props) {
  return (
    <>
      {cards.map((card, index) => (
        <div
          key={card.id}
          className={`card-enter ${
            layout === "rail"
              ? RAIL_ITEM_CLASS
              : "w-full max-w-[22rem] sm:max-w-none"
          }`}
          style={{ animationDelay: `${Math.min(index * 45, 360)}ms` }}
        >
          <CardTile
            card={card}
            deckLabel={deckLabelFor(card)}
            isBack={flippedIds.has(card.id)}
            isFavorite={activeFavoriteIds.has(card.id)}
            layout={layout}
            onFlip={() => onFlip(card.id)}
            onOpen={() => onOpen(index)}
            onToggleFavorite={() => onToggleFavorite(card.id)}
          />
        </div>
      ))}
    </>
  );
}
