"use client";

import { useEffect, useRef, useState } from "react";
import type { MouseEvent, TouchEvent } from "react";

import { createCopyForAiMarkdown } from "@/lib/copyForAi";
import { useCopyForAiFeatureFlag } from "@/lib/featureFlags";
import { CardImageStorageRepository } from "@/lib/supabase/cardImageStorageRepository";
import type { Card } from "@/lib/types";
import { recordUsageEvent } from "@/lib/usageEvents";
import { useEscapeKey } from "@/lib/useEscapeKey";

import CardFace from "./CardFace";
import CardDetailActionBar from "./CardDetailActionBar";
import FullscreenImageViewer from "./FullscreenImageViewer";
import { defaultImageForCard, formatDate } from "./cardUiUtils";
import useCardDetailViewCycle, {
  type CardDetailViewMode,
} from "./useCardDetailViewCycle";

const sideNavButtonClass =
  "pointer-events-auto absolute top-[54%] z-30 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-[#e0d3c0]/38 bg-[#fffaf0]/44 text-3xl font-semibold leading-none text-[#5f513f]/62 opacity-72 shadow-[0_3px_10px_rgba(87,72,52,0.08)] backdrop-blur-md transition hover:bg-[#fffaf0]/72 hover:text-[#5f513f] hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-[#d8c8aa] sm:top-1/2 sm:h-12 sm:w-12 sm:border-[#e0d3c0]/80 sm:bg-[#fffaf0]/86 sm:text-4xl sm:text-[#5f513f] sm:opacity-100 sm:shadow-[0_8px_24px_rgba(87,72,52,0.22)] sm:hover:bg-white";
const shutterButtonClass =
  "relative flex h-[72px] w-[72px] items-center justify-center rounded-full border border-[#d7c8b2] bg-[#fffaf0]/82 shadow-[0_18px_42px_rgba(87,72,52,0.22)] backdrop-blur-md transition hover:scale-[1.03] hover:bg-white focus:outline-none focus:ring-2 focus:ring-[#d8c8aa] focus:ring-offset-4 focus:ring-offset-[#f7f3ea] active:scale-95 sm:h-20 sm:w-20";
const detailCardFrameClass =
  "w-full max-w-[min(350px,calc((100dvh-13rem)*0.69),calc(100vw-2rem))] sm:max-w-[460px]";
const detailCardAspectClass = "aspect-[3/4.35] sm:aspect-[3/4]";

function debugImageState(message: string, payload: Record<string, unknown>) {
  if (process.env.NODE_ENV !== "production") {
    console.debug(`[Life Cards image detail] ${message}`, payload);
  }
}

export default function CardDetailModal({
  card,
  deckLabel,
  isFavorite,
  hasMultipleCards,
  onClose,
  onDelete,
  onEdit,
  onNext,
  onNextFullscreenImage,
  onPrevious,
  onShare,
  onToggleFavorite,
  canGoNextFullscreenImage = false,
  initialViewMode = "front",
}: {
  card: Card;
  canGoNextFullscreenImage?: boolean;
  deckLabel: string;
  index: number;
  isFavorite: boolean;
  hasMultipleCards: boolean;
  initialViewMode?: CardDetailViewMode;
  onClose: () => void;
  onDelete: () => void;
  onEdit: () => void;
  onNext: () => void;
  onNextFullscreenImage?: (
    currentCardId: string,
  ) => Promise<{ cardId: string; imageUrl: string } | null>;
  onPrevious: () => void;
  onShare: () => void;
  onToggleFavorite: () => void;
}) {
  const touchStartX = useRef<number | null>(null);
  const shouldSkipNextClick = useRef(false);
  const [fullscreenImagePath, setFullscreenImagePath] = useState("");
  const [fullscreenImageCardId, setFullscreenImageCardId] = useState("");
  const [isFullscreenPhotoOpen, setIsFullscreenPhotoOpen] = useState(false);
  const [isResolvingNextFullscreenImage, setIsResolvingNextFullscreenImage] =
    useState(false);
  const [isResolvingFullscreenImage, setIsResolvingFullscreenImage] =
    useState(false);
  const isCopyForAiVisible = useCopyForAiFeatureFlag();
  const [copyForAiStatus, setCopyForAiStatus] = useState<
    "copied" | "failed" | "idle" | "working"
  >("idle");
  const [resolvedStorageImage, setResolvedStorageImage] = useState<{
    signedUrl: string;
    status: "error" | "resolved";
    storagePath: string;
  } | null>(null);
  const copyForAiStatusResetTimerRef =
    useRef<ReturnType<typeof setTimeout> | null>(null);
  const imageStoragePath = card.imageStoragePath?.trim() ?? "";
  const storageResolutionMatches =
    resolvedStorageImage?.storagePath === imageStoragePath;
  const displayImagePath =
    card.imagePath?.trim() ||
    (storageResolutionMatches && resolvedStorageImage.status === "resolved"
      ? resolvedStorageImage.signedUrl
      : "");
  const backgroundImage = displayImagePath || defaultImageForCard(card);
  const hasAttachedImage = Boolean(
    card.imagePath?.trim() || imageStoragePath,
  );
  const canOpenFullscreen = Boolean(displayImagePath);
  const imageResolveFailed =
    storageResolutionMatches && resolvedStorageImage.status === "error";
  const actionBarHasImage = hasAttachedImage;
  const date = formatDate(card.createdAt);
  const {
    viewMode,
    rotationAngle,
    frontFaceStep,
    backFaceStep,
    cycleViewMode,
    returnToFront,
  } = useCardDetailViewCycle(initialViewMode);

  useEscapeKey(() => {
    onClose();
  });

  useEffect(() => {
    return () => {
      if (copyForAiStatusResetTimerRef.current) {
        clearTimeout(copyForAiStatusResetTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    debugImageState("render values", {
      actionBarHasImage,
      canOpenFullscreen,
      cardId: card.id,
      cardImagePath: card.imagePath,
      cardImageStoragePath: card.imageStoragePath,
      displayImagePath,
      hasAttachedImage,
      imageResolveFailed,
      imageStoragePath,
      isResolvingFullscreenImage,
      resolvedStorageImage,
    });
  }, [
    actionBarHasImage,
    canOpenFullscreen,
    card.id,
    card.imagePath,
    card.imageStoragePath,
    displayImagePath,
    hasAttachedImage,
    imageResolveFailed,
    imageStoragePath,
    isResolvingFullscreenImage,
    resolvedStorageImage,
  ]);

  useEffect(() => {
    let isActive = true;

    if (card.imagePath?.trim() || !imageStoragePath) {
      debugImageState("skip signed URL prefetch", {
        cardId: card.id,
        cardImagePath: card.imagePath,
        imageStoragePath,
      });

      return () => {
        isActive = false;
      };
    }

    debugImageState("signed URL prefetch start", {
      cardId: card.id,
      path: imageStoragePath,
    });

    CardImageStorageRepository.getCachedSignedImageUrl(imageStoragePath)
      .then((signedUrl) => {
        debugImageState("signed URL prefetch result", {
          cardId: card.id,
          hasSignedUrl: Boolean(signedUrl),
          path: imageStoragePath,
        });

        if (isActive) {
          setResolvedStorageImage({
            signedUrl: signedUrl ?? "",
            status: signedUrl ? "resolved" : "error",
            storagePath: imageStoragePath,
          });
        }
      })
      .catch((error) => {
        console.warn("Life Cards detail image signed URL failed", error);
        debugImageState("signed URL prefetch failed", {
          cardId: card.id,
          error,
          path: imageStoragePath,
        });

        if (isActive) {
          setResolvedStorageImage({
            signedUrl: "",
            status: "error",
            storagePath: imageStoragePath,
          });
        }
      });

    return () => {
      isActive = false;
    };
  }, [card.id, card.imagePath, imageStoragePath]);

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
    event.stopPropagation();

    if (shouldSkipNextClick.current) {
      event.preventDefault();
      shouldSkipNextClick.current = false;
      return;
    }

    cycleViewMode();
  }

  function handleDetailBackdropClick(event: MouseEvent<HTMLDivElement>) {
    event.stopPropagation();

    if (event.target !== event.currentTarget) {
      return;
    }

    if (viewMode === "back") {
      returnToFront();
    }
  }

  async function openFullscreenPhoto() {
    const directImagePath = card.imagePath?.trim();

    debugImageState("open requested", {
      canOpenFullscreen,
      actionBarHasImage,
      cardId: card.id,
      directImagePath,
      displayImagePath,
      imageStoragePath,
    });

    if (directImagePath) {
      setFullscreenImagePath(directImagePath);
      setFullscreenImageCardId(card.id);
      setIsFullscreenPhotoOpen(true);
      return;
    }

    if (displayImagePath) {
      setFullscreenImagePath(displayImagePath);
      setFullscreenImageCardId(card.id);
      setIsFullscreenPhotoOpen(true);
      return;
    }

    if (!imageStoragePath) {
      return;
    }

    setIsResolvingFullscreenImage(true);

    try {
      debugImageState("signed URL resolve on click start", {
        cardId: card.id,
        path: imageStoragePath,
      });

      const signedUrl =
        await CardImageStorageRepository.getCachedSignedImageUrl(
          imageStoragePath,
        );

      debugImageState("signed URL resolve on click result", {
        cardId: card.id,
        hasSignedUrl: Boolean(signedUrl),
        path: imageStoragePath,
      });

      setResolvedStorageImage({
        signedUrl: signedUrl ?? "",
        status: signedUrl ? "resolved" : "error",
        storagePath: imageStoragePath,
      });

      if (signedUrl) {
        setFullscreenImagePath(signedUrl);
        setFullscreenImageCardId(card.id);
        setIsFullscreenPhotoOpen(true);
      }
    } catch (error) {
      console.warn("Life Cards fullscreen image signed URL failed", error);
      debugImageState("signed URL resolve on click failed", {
        cardId: card.id,
        error,
        path: imageStoragePath,
      });
      setResolvedStorageImage({
        signedUrl: "",
        status: "error",
        storagePath: imageStoragePath,
      });
    } finally {
      setIsResolvingFullscreenImage(false);
    }
  }

  async function showNextFullscreenImage() {
    if (!onNextFullscreenImage || isResolvingNextFullscreenImage) {
      return;
    }

    setIsResolvingNextFullscreenImage(true);

    try {
      const nextImage = await onNextFullscreenImage(
        fullscreenImageCardId || card.id,
      );

      if (nextImage) {
        setFullscreenImagePath(nextImage.imageUrl);
        setFullscreenImageCardId(nextImage.cardId);
      }
    } finally {
      setIsResolvingNextFullscreenImage(false);
    }
  }

  function returnFullscreenPhotoToDetail() {
    setIsFullscreenPhotoOpen(false);
    returnToFront();
  }

  function showCopyForAiStatus(status: "copied" | "failed") {
    if (copyForAiStatusResetTimerRef.current) {
      clearTimeout(copyForAiStatusResetTimerRef.current);
    }

    setCopyForAiStatus(status);
    copyForAiStatusResetTimerRef.current = setTimeout(() => {
      setCopyForAiStatus("idle");
      copyForAiStatusResetTimerRef.current = null;
    }, 3500);
  }

  async function copyMarkdownToClipboard(markdown: string) {
    await navigator.clipboard.writeText(markdown);
  }

  async function handleCopyForAi() {
    const markdown = createCopyForAiMarkdown(card, { deckLabel });

    setCopyForAiStatus("working");

    try {
      await copyMarkdownToClipboard(markdown);
      showCopyForAiStatus("copied");
      void recordUsageEvent("copy_for_ai_used", {
        cardId: card.id,
        deckId: card.deckId,
      });
    } catch (clipboardError) {
      console.warn("Life Cards Copy for AI failed", { clipboardError });
      showCopyForAiStatus("failed");
    }
  }

  const previousNavPositionClass = "left-[-1.25rem] sm:left-[-3.5rem]";
  const nextNavPositionClass = "right-[-1.25rem] sm:right-[-3.5rem]";
  const cardShadowClass =
    card.imageFitMode === "blurExtend"
      ? "shadow-[0_28px_90px_rgba(126,107,82,0.2)]"
      : "shadow-[0_28px_80px_rgba(87,72,52,0.3)]";
  const copyForAiToastMessage =
    copyForAiStatus === "copied"
      ? "プロンプトをコピーしました"
      : copyForAiStatus === "failed"
        ? "コピーできませんでした"
        : null;
  return (
    <>
      <div
        aria-hidden="true"
        className="fixed inset-0 z-0 cursor-default"
        onClick={handleDetailBackdropClick}
        onPointerCancel={(event) => event.stopPropagation()}
        onPointerDown={(event) => event.stopPropagation()}
        onPointerMove={(event) => event.stopPropagation()}
        onPointerUp={(event) => event.stopPropagation()}
        onTouchEnd={(event) => event.stopPropagation()}
        onTouchMove={(event) => event.stopPropagation()}
        onTouchStart={(event) => event.stopPropagation()}
      />
      <div className="pointer-events-none relative z-10 mx-auto flex w-full max-w-3xl flex-col items-center gap-5 sm:gap-5">
        <div
          className={`pointer-events-none relative mx-auto ${detailCardFrameClass}`}
        >
          <article
            onClick={handleCardClick}
            onTouchStart={handleCardTouchStart}
            onTouchEnd={handleCardTouchEnd}
            className={`pointer-events-auto relative mx-auto ${detailCardAspectClass} ${detailCardFrameClass} cursor-pointer overflow-hidden rounded-[24px] transition-[max-width,aspect-ratio] duration-500 ease-out [perspective:1000px] ${cardShadowClass}`}
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
                  imageFrameMode={card.imageFrameMode}
                  linkUrl={card.linkUrl}
                  size="detail"
                />
              </div>
              <div
                className={`absolute inset-0 [transform-style:preserve-3d] ${
                  viewMode === "back" ? "z-10" : "pointer-events-none z-0"
                }`}
                style={{
                  transform: `rotateY(${backFaceStep * 180 - 180}deg)`,
                }}
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
                  imageFrameMode={card.imageFrameMode}
                  linkUrl={card.linkUrl}
                  size="detail"
                />
              </div>
            </div>
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

        <div className="pointer-events-auto relative">
          <CardDetailActionBar
            copyForAiStatus={copyForAiStatus}
            hasImage={actionBarHasImage}
            isFavorite={isFavorite}
            isSubdued={viewMode === "back"}
            onClose={onClose}
            onCopyForAi={handleCopyForAi}
            onDelete={onDelete}
            onEdit={onEdit}
            onOpenPhoto={openFullscreenPhoto}
            onShare={onShare}
            onToggleFavorite={onToggleFavorite}
            showCopyForAi={isCopyForAiVisible}
          />
          {copyForAiToastMessage ? (
            <p
              aria-live="polite"
              className="absolute bottom-[calc(100%+0.5rem)] left-1/2 z-40 w-max max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-full border border-[#d8c8aa] bg-[#fffaf0]/95 px-3 py-1.5 text-center text-xs font-semibold leading-tight text-[#4f4437] shadow-[0_10px_26px_rgba(87,72,52,0.18)] backdrop-blur-md"
            >
              {copyForAiToastMessage}
            </p>
          ) : null}
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
            alt={card.frontText ?? ""}
            canGoNextImage={canGoNextFullscreenImage}
            imageSrc={fullscreenImagePath}
            isResolvingNextImage={isResolvingNextFullscreenImage}
            onBackdropClick={returnFullscreenPhotoToDetail}
            onClose={() => setIsFullscreenPhotoOpen(false)}
            onNextImage={showNextFullscreenImage}
          />
        ) : null}
      </div>
    </>
  );
}
