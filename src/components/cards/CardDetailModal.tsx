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

const sideNavButtonClass =
  "pointer-events-auto absolute top-1/2 z-30 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-[#e0d3c0]/80 bg-[#fffaf0]/86 text-3xl font-semibold leading-none text-[#5f513f] shadow-[0_8px_24px_rgba(87,72,52,0.22)] backdrop-blur-md transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-[#d8c8aa] sm:h-12 sm:w-12 sm:text-4xl";
const shutterButtonClass =
  "relative flex h-[72px] w-[72px] items-center justify-center rounded-full border border-[#d7c8b2] bg-[#fffaf0]/82 shadow-[0_18px_42px_rgba(87,72,52,0.22)] backdrop-blur-md transition hover:scale-[1.03] hover:bg-white focus:outline-none focus:ring-2 focus:ring-[#d8c8aa] focus:ring-offset-4 focus:ring-offset-[#f7f3ea] active:scale-95 sm:h-20 sm:w-20";

export default function CardDetailModal({
  card,
  deckLabel,
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
  deckLabel: string;
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
    showFront,
    showPhoto,
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

    if (viewMode === "photo") {
      return;
    }

    cycleViewMode();
  }

  const previousNavPositionClass =
    viewMode === "photo"
      ? "left-2 sm:left-4"
      : "left-[-1.25rem] sm:left-[-3.5rem]";
  const nextNavPositionClass =
    viewMode === "photo"
      ? "right-2 sm:right-4"
      : "right-[-1.25rem] sm:right-[-3.5rem]";

  return (
    <div
      className={`pointer-events-none mx-auto flex w-full flex-col items-center gap-4 sm:gap-4 ${
        viewMode === "photo" ? "max-w-4xl" : "max-w-3xl"
      }`}
    >
      <div
        className={`pointer-events-none relative mx-auto w-full ${
          viewMode === "photo"
            ? "max-w-[min(38rem,calc(100vw-2rem))] sm:max-w-4xl"
            : "max-w-[min(330px,calc((100dvh-13.5rem)*0.75),calc(100vw-3rem))] sm:max-w-[460px]"
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
          className={`pointer-events-auto relative mx-auto w-full overflow-hidden rounded-[24px] shadow-[0_28px_80px_rgba(87,72,52,0.3)] transition-[max-width,aspect-ratio] duration-500 ease-out [perspective:1000px] ${
            viewMode === "photo"
              ? "aspect-[4/3] max-h-[58dvh] max-w-[min(38rem,calc(100vw-2rem))] sm:max-h-[70vh] sm:max-w-4xl"
              : "aspect-[3/4] max-w-[min(330px,calc((100dvh-13.5rem)*0.75),calc(100vw-3rem))] sm:max-w-[460px]"
          } ${
            viewMode === "photo" && photoZoom > 1 ? "cursor-default" : "cursor-pointer"
          }`}
        >
          {viewMode === "photo" ? (
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
          ) : (
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
                  deckLabel={deckLabel}
                  face="front"
                  frontComment={card.frontComment}
                  frontText={card.frontText}
                  imageFitMode={card.imageFitMode}
                  linkUrl={card.linkUrl}
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
                  deckLabel={deckLabel}
                  face="back"
                  frontComment={card.frontComment}
                  frontText={card.frontText}
                  imageFitMode={card.imageFitMode}
                  linkUrl={card.linkUrl}
                  size="detail"
                />
              </div>
            </div>
          )}
          {viewMode !== "photo" ? (
            <button
              type="button"
              aria-label={isFavorite ? "お気に入りを解除" : "お気に入りに追加"}
              aria-pressed={isFavorite}
              onClick={(event) => {
                event.stopPropagation();
                onToggleFavorite();
              }}
              className={`absolute bottom-5 right-5 z-20 flex h-11 w-11 items-center justify-center rounded-full border text-lg leading-none shadow-sm backdrop-blur-md transition focus:outline-none focus:ring-2 focus:ring-white/70 focus:ring-offset-2 focus:ring-offset-[#fffaf0] ${
                isFavorite
                  ? "border-[#ffe28a]/70 bg-[#fff4c7]/95 text-[#8a6410] hover:bg-[#ffef9c]"
                  : "border-white/25 bg-black/35 text-white/85 hover:bg-black/50 hover:text-white"
              }`}
            >
              {isFavorite ? "★" : "☆"}
            </button>
          ) : null}
        </article>

        {hasMultipleCards ? (
          <>
            <button
              type="button"
              aria-label="前へ"
              onClick={(event) => {
                event.stopPropagation();
                if (viewMode === "photo") {
                  showPreviousPhoto();
                  return;
                }

                onPrevious();
              }}
              className={`${sideNavButtonClass} ${previousNavPositionClass}`}
            >
              ‹
            </button>
            <button
              type="button"
              aria-label="次へ"
              onClick={(event) => {
                event.stopPropagation();
                if (viewMode === "photo") {
                  showNextPhoto();
                  return;
                }

                onNext();
              }}
              className={`${sideNavButtonClass} ${nextNavPositionClass}`}
            >
              ›
            </button>
          </>
        ) : null}
      </div>

      <div className="pointer-events-auto">
        <CardDetailActionBar
          isPhotoMode={viewMode === "photo"}
          photoZoom={photoZoom}
          zoomLabel={zoomLabel}
          onClose={onClose}
          onDecreasePhotoZoom={decreasePhotoZoom}
          onDelete={onDelete}
          onEdit={onEdit}
          onIncreasePhotoZoom={increasePhotoZoom}
          onOpenPhoto={showPhoto}
          onResetPhotoZoom={resetPhotoZoom}
          onShowFront={showFront}
          onShare={onShare}
        />
      </div>

      {hasMultipleCards ? (
        <div className="pointer-events-auto -mt-1 flex justify-center pb-[env(safe-area-inset-bottom)] sm:-mt-0.5">
          <button
            type="button"
            aria-label="次のカードを見る"
            onClick={(event) => {
              event.stopPropagation();
              if (viewMode === "photo") {
                showNextPhoto();
                return;
              }

              onNext();
            }}
            className={shutterButtonClass}
          >
            <span className="h-[54px] w-[54px] rounded-full border-[5px] border-[#fefbf4] bg-[#f0e4d2] shadow-inner shadow-white/80 sm:h-[60px] sm:w-[60px]" />
          </button>
        </div>
      ) : null}
    </div>
  );
}
