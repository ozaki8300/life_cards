"use client";

import { useRef } from "react";
import type { MouseEvent, TouchEvent } from "react";

import type { Card } from "@/lib/types";
import { useEscapeKey } from "@/lib/useEscapeKey";

import CardFace from "./CardFace";
import CardDetailActionBar from "./CardDetailActionBar";
import CardDetailPhotoFace from "./CardDetailPhotoFace";
import { defaultImageForCard, formatDate } from "./cardUiUtils";
import useCardDetailViewCycle from "./useCardDetailViewCycle";
import usePhotoPanZoom from "./usePhotoPanZoom";

export default function CardDetailModal({
  card,
  isFavorite,
  hasMultipleCards,
  onClose,
  onDelete,
  onEdit,
  onNext,
  onPrevious,
  onShare,
  onToggleFavorite,
}: {
  card: Card;
  index: number;
  isFavorite: boolean;
  hasMultipleCards: boolean;
  onClose: () => void;
  onDelete: () => void;
  onEdit: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onShare: () => void;
  onToggleFavorite: () => void;
}) {
  const touchStartX = useRef<number | null>(null);
  const shouldSkipNextClick = useRef(false);
  const backgroundImage = card.imagePath || defaultImageForCard(card.id);
  const date = formatDate(card.createdAt);
  const {
    viewMode,
    rotationAngle,
    frontFaceStep,
    backFaceStep,
    photoFaceStep,
    showFront,
    cycleViewMode,
  } = useCardDetailViewCycle({
    resetPhotoZoom: () => resetPhotoZoom(),
  });
  const {
    photoZoom,
    photoOffset,
    isPhotoDragging,
    zoomLabel,
    resetPhotoZoom,
    increasePhotoZoom,
    decreasePhotoZoom,
    handlePhotoPointerDown,
    handlePhotoPointerMove,
    handlePhotoPointerEnd,
  } = usePhotoPanZoom({
    isPhotoMode: viewMode === "photo",
    shouldSkipNextClickRef: shouldSkipNextClick,
  });

  useEscapeKey(() => {
    if (viewMode === "photo") {
      showFront();
      return;
    }

    onClose();
  });

  function showPreviousPhoto() {
    resetPhotoZoom();
    onPrevious();
  }

  function showNextPhoto() {
    resetPhotoZoom();
    onNext();
  }

  function handleCardTouchStart(event: TouchEvent<HTMLElement>) {
    touchStartX.current = event.changedTouches[0].clientX;
    shouldSkipNextClick.current = false;
  }

  function handleCardTouchEnd(event: TouchEvent<HTMLElement>) {
    if (touchStartX.current === null) {
      return;
    }

    const deltaX = event.changedTouches[0].clientX - touchStartX.current;

    if (Math.abs(deltaX) >= 50) {
      shouldSkipNextClick.current = true;
    }

    touchStartX.current = null;
  }

  function handleCardClick(event: MouseEvent<HTMLElement>) {
    if (shouldSkipNextClick.current) {
      event.preventDefault();
      shouldSkipNextClick.current = false;
      return;
    }

    cycleViewMode(photoZoom);
  }

  return (
    <div
      className={`mx-auto flex w-full flex-col items-center gap-3 sm:gap-4 ${
        viewMode === "photo" ? "max-w-4xl" : "max-w-3xl"
      }`}
    >
      <article
        onClick={handleCardClick}
        onTouchStart={(event) => {
          if (viewMode === "photo") {
            event.stopPropagation();
            return;
          }

          handleCardTouchStart(event);
        }}
        onTouchEnd={(event) => {
          if (viewMode === "photo") {
            event.stopPropagation();
            return;
          }

          handleCardTouchEnd(event);
        }}
        className={`relative w-full overflow-hidden rounded-[24px] shadow-[0_28px_80px_rgba(87,72,52,0.3)] transition-[max-width,aspect-ratio] duration-500 ease-out [perspective:1000px] ${
          viewMode === "photo"
            ? "aspect-[4/3] max-h-[62dvh] max-w-4xl sm:max-h-[70vh]"
            : "aspect-[3/4] max-w-[min(390px,calc((100dvh-11rem)*0.75),calc(100vw-2rem))] sm:max-w-[460px]"
        } ${
          viewMode === "photo" && photoZoom > 1 ? "cursor-default" : "cursor-pointer"
        }`}
      >
        <div
          className="absolute inset-0 rounded-[24px] transition-transform duration-500 ease-out [transform-style:preserve-3d] motion-reduce:transition-none"
          style={{ transform: `rotateY(${rotationAngle}deg)` }}
        >
          <div
            className={`absolute inset-0 [transform-style:preserve-3d] ${
              viewMode === "front" ? "z-10" : "pointer-events-none z-0"
            }`}
            style={{ transform: `rotateY(${frontFaceStep * 180}deg)` }}
          >
            <CardFace
              backgroundImage={backgroundImage}
              backText={card.backText}
              date={date}
              deckLabel={card.deckId}
              face="front"
              frontComment={card.frontComment}
              frontText={card.frontText}
              size="detail"
            />
          </div>
          <div
            className={`absolute inset-0 [transform-style:preserve-3d] ${
              viewMode === "back" ? "z-10" : "pointer-events-none z-0"
            }`}
            style={{ transform: `rotateY(${backFaceStep * 180 - 180}deg)` }}
          >
            <CardFace
              backgroundImage={backgroundImage}
              backText={card.backText}
              date={date}
              deckLabel={card.deckId}
              face="back"
              frontComment={card.frontComment}
              frontText={card.frontText}
              size="detail"
            />
          </div>
          <div
            className={`absolute inset-0 [transform-style:preserve-3d] ${
              viewMode === "photo" ? "z-10" : "pointer-events-none z-0"
            }`}
            style={{ transform: `rotateY(${photoFaceStep * 180}deg)` }}
          >
            <CardDetailPhotoFace
              backgroundImage={backgroundImage}
              isDragging={isPhotoDragging}
              offset={photoOffset}
              photoZoom={photoZoom}
              onPointerCancel={handlePhotoPointerEnd}
              onPointerDown={handlePhotoPointerDown}
              onPointerMove={handlePhotoPointerMove}
              onPointerUp={handlePhotoPointerEnd}
            />
          </div>
        </div>
        {viewMode !== "photo" ? (
          <button
            type="button"
            aria-label={isFavorite ? "お気に入りを解除" : "お気に入りに追加"}
            aria-pressed={isFavorite}
            onClick={(event) => {
              event.stopPropagation();
              onToggleFavorite();
            }}
            className={`absolute bottom-6 right-6 z-20 flex h-11 w-11 items-center justify-center rounded-full border text-lg leading-none shadow-sm backdrop-blur-md transition focus:outline-none focus:ring-2 focus:ring-white/70 focus:ring-offset-2 focus:ring-offset-[#fffaf0] ${
              isFavorite
                ? "border-[#ffe28a]/70 bg-[#fff4c7]/95 text-[#8a6410] hover:bg-[#ffef9c]"
                : "border-white/25 bg-black/35 text-white/85 hover:bg-black/50 hover:text-white"
            }`}
          >
            {isFavorite ? "★" : "☆"}
          </button>
        ) : null}
      </article>

      <CardDetailActionBar
        hasMultipleCards={hasMultipleCards}
        isPhotoMode={viewMode === "photo"}
        photoZoom={photoZoom}
        zoomLabel={zoomLabel}
        onClose={onClose}
        onDecreasePhotoZoom={decreasePhotoZoom}
        onDelete={onDelete}
        onEdit={onEdit}
        onIncreasePhotoZoom={increasePhotoZoom}
        onNext={viewMode === "photo" ? showNextPhoto : onNext}
        onPrevious={viewMode === "photo" ? showPreviousPhoto : onPrevious}
        onResetPhotoZoom={resetPhotoZoom}
        onShare={onShare}
      />
    </div>
  );
}
