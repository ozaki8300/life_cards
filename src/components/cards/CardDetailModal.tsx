"use client";

import { useEffect, useRef, useState } from "react";
import type { MouseEvent, TouchEvent } from "react";

import { CardImageStorageRepository } from "@/lib/supabase/cardImageStorageRepository";
import type { Card } from "@/lib/types";
import { useEscapeKey } from "@/lib/useEscapeKey";

import CardFace from "./CardFace";
import CardDetailActionBar from "./CardDetailActionBar";
import FullscreenImageViewer from "./FullscreenImageViewer";
import { defaultImageForCard, formatDate } from "./cardUiUtils";
import useCardDetailViewCycle from "./useCardDetailViewCycle";

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
  const [isFullscreenPhotoOpen, setIsFullscreenPhotoOpen] = useState(false);
  const [resolvedStorageImage, setResolvedStorageImage] = useState<{
    signedUrl: string;
    storagePath: string;
  } | null>(null);
  const imageStoragePath = card.imageStoragePath?.trim() ?? "";
  const displayImagePath =
    card.imagePath?.trim() ||
    (resolvedStorageImage?.storagePath === imageStoragePath
      ? resolvedStorageImage.signedUrl
      : "");
  const backgroundImage = displayImagePath || defaultImageForCard(card.id);
  const hasAttachedImage = Boolean(
    card.imagePath?.trim() || imageStoragePath,
  );
  const canOpenFullscreen = Boolean(displayImagePath);
  const date = formatDate(card.createdAt);
  const {
    viewMode,
    rotationAngle,
    frontFaceStep,
    backFaceStep,
    cycleViewMode,
  } = useCardDetailViewCycle();

  useEscapeKey(() => {
    onClose();
  });

  useEffect(() => {
    let isActive = true;

    if (card.imagePath?.trim() || !imageStoragePath) {
      return () => {
        isActive = false;
      };
    }

    CardImageStorageRepository.getCachedSignedImageUrl(imageStoragePath)
      .then((signedUrl) => {
        if (isActive) {
          setResolvedStorageImage({
            signedUrl: signedUrl ?? "",
            storagePath: imageStoragePath,
          });
        }
      })
      .catch((error) => {
        console.warn("Life Cards detail image signed URL failed", error);
        if (isActive) {
          setResolvedStorageImage({
            signedUrl: "",
            storagePath: imageStoragePath,
          });
        }
      });

    return () => {
      isActive = false;
    };
  }, [card.imagePath, imageStoragePath]);

  function showPreviousPhoto() {
    onPrevious();
  }

  function showNextPhoto() {
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

    cycleViewMode();
  }

  function openFullscreenPhoto() {
    if (!canOpenFullscreen) {
      return;
    }

    setIsFullscreenPhotoOpen(true);
  }

  const previousNavPositionClass = "left-[-1.25rem] sm:left-[-3.5rem]";
  const nextNavPositionClass = "right-[-1.25rem] sm:right-[-3.5rem]";

  return (
    <div className="pointer-events-none mx-auto flex w-full max-w-3xl flex-col items-center gap-4 sm:gap-4">
      <div
        className="pointer-events-none relative mx-auto w-full max-w-[min(350px,calc((100dvh-13rem)*0.75),calc(100vw-2rem))] sm:max-w-[460px]"
      >
        <article
          onClick={handleCardClick}
          onTouchStart={handleCardTouchStart}
          onTouchEnd={handleCardTouchEnd}
          className="pointer-events-auto relative mx-auto aspect-[3/4] w-full max-w-[min(350px,calc((100dvh-13rem)*0.75),calc(100vw-2rem))] cursor-pointer overflow-hidden rounded-[24px] shadow-[0_28px_80px_rgba(87,72,52,0.3)] transition-[max-width,aspect-ratio] duration-500 ease-out [perspective:1000px] sm:max-w-[460px]"
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
          <button
            type="button"
            aria-label={isFavorite ? "お気に入りを解除" : "お気に入りに追加"}
            aria-pressed={isFavorite}
            onClick={(event) => {
              event.stopPropagation();
              onToggleFavorite();
            }}
            className={`absolute bottom-5 right-5 z-20 flex h-11 w-11 items-center justify-center rounded-full border text-lg leading-none shadow-[0_4px_14px_rgba(87,72,52,0.14)] backdrop-blur-md transition focus:outline-none focus:ring-2 focus:ring-white/70 focus:ring-offset-2 focus:ring-offset-[#fffaf0] ${
              isFavorite
                ? "border-[#d8c8aa]/70 bg-[#fff4c7]/82 text-[#8a6410] hover:bg-[#fff0b5]"
                : "border-[#d8c8aa]/60 bg-[#fffaf0]/64 text-[#6f6253]/82 hover:bg-[#fffaf0]/82 hover:text-[#5f5346]"
            }`}
          >
            {isFavorite ? "★" : "☆"}
          </button>
        </article>

        {hasMultipleCards ? (
          <>
            <button
              type="button"
              aria-label="前へ"
              onClick={(event) => {
                event.stopPropagation();
                showPreviousPhoto();
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
                showNextPhoto();
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
          hasImage={hasAttachedImage && canOpenFullscreen}
          onClose={onClose}
          onDelete={onDelete}
          onEdit={onEdit}
          onOpenPhoto={openFullscreenPhoto}
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
              showNextPhoto();
            }}
            className={shutterButtonClass}
          >
            <span className="h-[54px] w-[54px] rounded-full border-[5px] border-[#fefbf4] bg-[#f0e4d2] shadow-inner shadow-white/80 sm:h-[60px] sm:w-[60px]" />
          </button>
        </div>
      ) : null}

      {isFullscreenPhotoOpen ? (
        <FullscreenImageViewer
          imageSrc={displayImagePath}
          onClose={() => setIsFullscreenPhotoOpen(false)}
        />
      ) : null}
    </div>
  );
}
