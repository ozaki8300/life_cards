"use client";

import type { MouseEvent, PointerEvent, TouchEvent } from "react";

import type { Card } from "@/lib/types";

import CardTile from "./CardTile";
import type { CardDetailViewMode } from "./useCardDetailViewCycle";

const RAIL_ITEM_CLASS =
  "w-[min(22rem,calc(100vw_-_2.5rem))] shrink-0 snap-start overflow-visible rounded-[18px] sm:w-[calc((100%_-_2.5rem)/3)] lg:w-[calc((100%_-_3.75rem)/4)]";
const faceControlBaseClass =
  "absolute z-[10000] flex items-center justify-center rounded-full border backdrop-blur-[2px] transition focus:outline-none focus:ring-2 focus:ring-white/70";
const openDetailButtonClass = `${faceControlBaseClass} bottom-3 right-3 h-10 w-10 border-[#d8c8aa]/32 bg-[#f5eee1]/60 text-lg font-semibold leading-none text-[#8f806d] shadow-[0_6px_16px_rgba(87,72,52,0.075)] hover:border-[#d8c8aa]/48 hover:bg-[#fffaf0]/76 hover:text-[#756750]`;
const favoriteButtonBaseClass = `${faceControlBaseClass} right-3 top-3 h-10 w-10 text-lg leading-none shadow-[0_6px_16px_rgba(87,72,52,0.075)] focus:ring-offset-2 focus:ring-offset-[#fffaf0]`;

type OverlayButtonEvent =
  | MouseEvent<HTMLButtonElement>
  | PointerEvent<HTMLButtonElement>
  | TouchEvent<HTMLButtonElement>;

type Props = {
  activeFavoriteIds: Set<string>;
  cards: Card[];
  deckLabelFor: (card: Card) => string;
  flippedIds: Set<string>;
  layout: "grid" | "rail";
  onFlip: (cardId: string) => void;
  onOpen: (index: number, initialViewMode: CardDetailViewMode) => void;
  onToggleFavorite: (cardId: string) => void;
  railCaptionByCardId?: Record<string, string>;
  reasonByCardId?: Record<string, string>;
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
  railCaptionByCardId,
  reasonByCardId,
}: Props) {
  function stopOverlayButtonEvent(event: OverlayButtonEvent) {
    event.stopPropagation();
  }

  return (
    <>
      {cards.map((card, index) => {
        const isBack = flippedIds.has(card.id);
        const isFavorite = activeFavoriteIds.has(card.id);
        const railCaption = railCaptionByCardId?.[card.id]?.trim() ?? "";
        const reasonCaption = reasonByCardId?.[card.id]?.trim() ?? "";
        const favoriteButtonToneClass = isFavorite
          ? "border-[#d8c8aa]/42 bg-[#fff2c8]/66 text-[#8a6f24] hover:bg-[#fff0b5]/80 hover:text-[#765d19]"
          : "border-[#d8c8aa]/32 bg-[#f5eee1]/60 text-[#8f806d] hover:border-[#d8c8aa]/48 hover:bg-[#fffaf0]/76 hover:text-[#756750]";

        return (
          <div
            key={card.id}
            className={`card-enter relative overflow-visible ${
              layout === "rail"
                ? RAIL_ITEM_CLASS
                : "w-full max-w-[22rem] sm:max-w-none"
            }`}
            style={{ animationDelay: `${Math.min(index * 45, 360)}ms` }}
          >
            <CardTile
              card={card}
              deckLabel={deckLabelFor(card)}
              isBack={isBack}
              layout={layout}
              onFlip={() => onFlip(card.id)}
            />

            {layout === "rail" && reasonCaption ? (
              <p className="mx-auto mt-2 max-w-full truncate px-1 text-center text-[11px] font-semibold leading-tight text-[#8c7a62]">
                <span className="inline-block max-w-full truncate rounded-full border border-[#e7dac8]/80 bg-[#fffaf0]/66 px-2.5 py-1 shadow-[0_4px_12px_rgba(87,72,52,0.045)]">
                  {reasonCaption}
                </span>
              </p>
            ) : null}

            <div className="pointer-events-none absolute inset-0 z-[9999]">
              {layout === "rail" && railCaption ? (
                <p className="absolute bottom-3 left-3 max-w-[calc(100%-4.25rem)] truncate rounded-full border border-[#e7dac8]/80 bg-[#fffaf0]/72 px-2.5 py-1 text-[11px] font-semibold leading-tight text-[#8c7a62] shadow-[0_6px_18px_rgba(87,72,52,0.08)] backdrop-blur-[2px]">
                  {railCaption}
                </p>
              ) : null}

              <button
                type="button"
                aria-label="Open card detail"
                data-card-action="true"
                onMouseDown={stopOverlayButtonEvent}
                onPointerDown={stopOverlayButtonEvent}
                onTouchStart={stopOverlayButtonEvent}
                onClick={(event) => {
                  stopOverlayButtonEvent(event);
                  onOpen(index, isBack ? "back" : "front");
                }}
                className={`${openDetailButtonClass} pointer-events-auto touch-manipulation`}
              >
                ...
              </button>

              <button
                type="button"
                aria-label={
                  isFavorite ? "Remove from favorites" : "Add to favorites"
                }
                aria-pressed={isFavorite}
                data-card-action="true"
                onMouseDown={stopOverlayButtonEvent}
                onPointerDown={stopOverlayButtonEvent}
                onTouchStart={stopOverlayButtonEvent}
                onClick={(event) => {
                  stopOverlayButtonEvent(event);
                  onToggleFavorite(card.id);
                }}
                className={`${favoriteButtonBaseClass} ${favoriteButtonToneClass} pointer-events-auto touch-manipulation`}
              >
                {isFavorite ? "★" : "☆"}
              </button>
            </div>
          </div>
        );
      })}
    </>
  );
}
