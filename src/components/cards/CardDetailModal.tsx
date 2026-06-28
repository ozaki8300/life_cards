"use client";

import { useEffect, useState } from "react";
import type { MouseEvent, TouchEvent, WheelEvent } from "react";

import MarkdownMemo from "@/components/MarkdownMemo";
import { CardImageStorageRepository } from "@/lib/supabase/cardImageStorageRepository";
import type { Card } from "@/lib/types";
import { useEscapeKey } from "@/lib/useEscapeKey";

import { defaultImageForCard, formatDate } from "./cardUiUtils";
import { RecallModeOverlay } from "./recall";
import type { CardDetailViewMode } from "./useCardDetailViewCycle";

const shutterButtonClass =
  "pointer-events-auto relative z-50 flex h-[72px] w-[72px] items-center justify-center rounded-full border border-[#d7c8b2] bg-[#fffaf0]/82 text-xs font-bold text-[#6f6253] shadow-[0_18px_42px_rgba(87,72,52,0.22)] backdrop-blur-md transition hover:scale-[1.03] hover:bg-white focus:outline-none focus:ring-2 focus:ring-[#d8c8aa] focus:ring-offset-4 focus:ring-offset-[#f7f3ea] active:scale-95 sm:h-20 sm:w-20";
const closeButtonClass =
  "flex h-12 w-12 items-center justify-center rounded-full border border-white/22 bg-black/34 text-3xl font-light leading-none text-white shadow-[0_12px_32px_rgba(0,0,0,0.24)] backdrop-blur-md transition hover:bg-black/48 focus:outline-none focus:ring-2 focus:ring-white/74 active:scale-95";
const topActionButtonClass =
  "flex h-12 min-w-12 items-center justify-center rounded-full border border-white/22 bg-black/34 px-3 text-xs font-bold leading-none text-white shadow-[0_12px_32px_rgba(0,0,0,0.24)] backdrop-blur-md transition hover:bg-black/48 focus:outline-none focus:ring-2 focus:ring-white/74 active:scale-95";
const menuItemClass =
  "flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-bold text-[#5f5346] transition hover:bg-[#fff5e6] focus:outline-none focus:ring-2 focus:ring-[#d8c8aa]";
const destructiveMenuItemClass =
  "flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-bold text-[#9b4b35] transition hover:bg-[#fff1eb] focus:outline-none focus:ring-2 focus:ring-[#e6c9be]";

function debugImageState(message: string, payload: Record<string, unknown>) {
  if (process.env.NODE_ENV !== "production") {
    console.debug(`[Life Cards image detail] ${message}`, payload);
  }
}

export default function CardDetailModal({
  card,
  cardCount,
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
  initialViewMode = "front",
}: {
  card: Card;
  cardCount: number;
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
  const [viewMode, setViewMode] =
    useState<CardDetailViewMode>(initialViewMode);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isRecallModeOpen, setIsRecallModeOpen] = useState(false);
  const [resolvedStorageImage, setResolvedStorageImage] = useState<{
    signedUrl: string;
    status: "error" | "resolved";
    storagePath: string;
  } | null>(null);
  const imageStoragePath = card.imageStoragePath?.trim() ?? "";
  const storageResolutionMatches =
    resolvedStorageImage?.storagePath === imageStoragePath;
  const displayImagePath =
    card.imagePath?.trim() ||
    (storageResolutionMatches && resolvedStorageImage.status === "resolved"
      ? resolvedStorageImage.signedUrl
      : "");
  const backgroundImage = displayImagePath || defaultImageForCard(card);
  const imageResolveFailed =
    storageResolutionMatches && resolvedStorageImage.status === "error";
  const date = formatDate(card.createdAt);
  const displayFrontText = card.frontText?.trim() ?? "";
  const isFrontView = viewMode === "front";
  const isBlurExtend = card.imageFitMode === "blurExtend";
  const frontSurfaceTextClass =
    backgroundImage.includes("default-paper.webp") || isBlurExtend
      ? "text-[#2f2a23]"
      : "text-white";
  const frontMediaInsetClass = "inset-0";
  const backViewBottomPaddingClass =
    "pb-[calc(env(safe-area-inset-bottom)+5.75rem)] sm:pb-[calc(env(safe-area-inset-bottom)+6.75rem)]";
  const canNavigateCards = hasMultipleCards && cardCount > 1;
  const nextViewModeLabel = isFrontView ? "裏面" : "表面";
  const flipStageClass = `absolute inset-0 [-webkit-transform-style:preserve-3d] [transform-style:preserve-3d] transition-transform duration-[420ms] ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform motion-reduce:transition-none ${
    isFrontView ? "[transform:rotateY(0deg)]" : "[transform:rotateY(180deg)]"
  }`;
  const flipFaceClass =
    "absolute inset-0 overflow-hidden [-webkit-backface-visibility:hidden] [backface-visibility:hidden]";

  useEscapeKey(() => {
    onClose();
  });

  useEffect(() => {
    const scrollY = window.scrollY;
    const previousBodyOverflow = document.body.style.overflow;
    const previousBodyOverscrollBehavior =
      document.body.style.overscrollBehavior;
    const previousBodyPosition = document.body.style.position;
    const previousBodyTop = document.body.style.top;
    const previousBodyWidth = document.body.style.width;
    const previousHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "none";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.body.style.overscrollBehavior = previousBodyOverscrollBehavior;
      document.body.style.position = previousBodyPosition;
      document.body.style.top = previousBodyTop;
      document.body.style.width = previousBodyWidth;
      document.documentElement.style.overflow = previousHtmlOverflow;
      window.scrollTo(0, scrollY);
    };
  }, []);

  useEffect(() => {
    debugImageState("render values", {
      cardId: card.id,
      cardImagePath: card.imagePath,
      cardImageStoragePath: card.imageStoragePath,
      displayImagePath,
      imageResolveFailed,
      imageStoragePath,
      resolvedStorageImage,
    });
  }, [
    card.id,
    card.imagePath,
    card.imageStoragePath,
    displayImagePath,
    imageResolveFailed,
    imageStoragePath,
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
    setIsMenuOpen(false);
    onPrevious();
  }

  function showNextPhoto() {
    setIsMenuOpen(false);
    onNext();
  }

  function toggleViewMode() {
    setIsMenuOpen(false);
    setViewMode((currentViewMode) =>
      currentViewMode === "front" ? "back" : "front",
    );
  }

  function toggleMenu() {
    setIsMenuOpen((current) => !current);
  }

  function closeMenu() {
    setIsMenuOpen(false);
  }

  function stopCardActionEvent(event: MouseEvent<HTMLElement>) {
    event.stopPropagation();
  }

  function handleCardSurfaceClick(event: MouseEvent<HTMLElement>) {
    const target = event.target;

    event.stopPropagation();

    if (
      target instanceof Element &&
      target.closest("a,button,input,textarea,select,[data-card-action='true']")
    ) {
      return;
    }

    toggleViewMode();
  }

  function handleDetailBackdropClick(event: MouseEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    event.nativeEvent.stopImmediatePropagation();
    onClose();
  }

  function stopModalScrollEvent(event: TouchEvent<HTMLElement> | WheelEvent<HTMLElement>) {
    event.stopPropagation();
  }

  function handleMenuFavorite() {
    closeMenu();
    onToggleFavorite();
  }

  function handleMenuDelete() {
    closeMenu();
    onDelete();
  }

  return (
    <>
      {isRecallModeOpen ? (
        <RecallModeOverlay
          backgroundImage={backgroundImage}
          card={card}
          date={date}
          deckLabel={deckLabel}
          onClose={() => setIsRecallModeOpen(false)}
        />
      ) : null}
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
        onWheel={(event) => event.stopPropagation()}
      />
      <div
        className="pointer-events-auto fixed inset-0 z-10 overflow-hidden bg-[#17110d]/90 text-[#332d25]"
        onClick={handleDetailBackdropClick}
        onTouchEnd={stopModalScrollEvent}
        onTouchMove={stopModalScrollEvent}
        onTouchStart={stopModalScrollEvent}
        onWheel={stopModalScrollEvent}
      >
        <div className="pointer-events-auto fixed right-3 top-[calc(env(safe-area-inset-top)+0.75rem)] z-50 flex items-center gap-2 sm:right-6 sm:top-[calc(env(safe-area-inset-top)+1rem)]">
          <button
            type="button"
            aria-label="Recall Mode を開く"
            className={topActionButtonClass}
            onClick={(event) => {
              event.stopPropagation();
              setIsRecallModeOpen(true);
            }}
            onPointerDown={(event) => event.stopPropagation()}
            onPointerUp={(event) => event.stopPropagation()}
            onTouchStart={(event) => event.stopPropagation()}
          >
            思い出す
          </button>
          <button
            type="button"
            aria-label="カードを編集"
            className={topActionButtonClass}
            onClick={(event) => {
              event.stopPropagation();
              onEdit();
            }}
            onPointerDown={(event) => event.stopPropagation()}
            onPointerUp={(event) => event.stopPropagation()}
            onTouchStart={(event) => event.stopPropagation()}
          >
            編集
          </button>
          <button
            type="button"
            aria-label="QR共有"
            className={topActionButtonClass}
            onClick={(event) => {
              event.stopPropagation();
              onShare();
            }}
            onPointerDown={(event) => event.stopPropagation()}
            onPointerUp={(event) => event.stopPropagation()}
            onTouchStart={(event) => event.stopPropagation()}
          >
            QR
          </button>
          <button
            type="button"
            aria-label="詳細画面を閉じる"
            className={closeButtonClass}
            onClick={(event) => {
              event.stopPropagation();
              onClose();
            }}
            onPointerDown={(event) => event.stopPropagation()}
            onPointerUp={(event) => event.stopPropagation()}
            onTouchStart={(event) => event.stopPropagation()}
          >
            ×
          </button>
        </div>
        <div className="absolute inset-0 [-webkit-perspective:1400px] [perspective:1400px]">
          <div className={flipStageClass}>
            {isFrontView ? (
              <section
                aria-label="表面の全画面表示"
                className={`${flipFaceClass} cursor-pointer pointer-events-auto`}
                onClick={handleCardSurfaceClick}
              >
                <div
                  aria-hidden="true"
                  className="absolute inset-0 scale-110 bg-cover bg-center opacity-58 blur-2xl"
                  style={{ backgroundImage: `url(${backgroundImage})` }}
                />
                <div
                  className={`absolute z-10 flex items-center justify-center ${frontMediaInsetClass}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    alt=""
                    aria-hidden="true"
                    className="h-full max-h-screen w-full max-w-screen object-contain drop-shadow-[0_18px_56px_rgba(0,0,0,0.3)]"
                    src={backgroundImage}
                  />
                </div>
                <div
                  aria-hidden="true"
                  className={`pointer-events-none absolute inset-0 z-[1] ${
                    frontSurfaceTextClass === "text-white"
                      ? "bg-gradient-to-t from-black/62 via-black/10 to-black/22"
                      : "bg-gradient-to-t from-[#fffaf0]/72 via-[#fffaf0]/10 to-[#fffaf0]/16"
                  }`}
                />
                <div
                  className={`absolute left-4 top-[calc(env(safe-area-inset-top)+1rem)] z-20 max-w-[min(22rem,calc(100vw-13rem))] rounded-2xl border px-3 py-2 shadow-[0_10px_30px_rgba(0,0,0,0.18)] backdrop-blur-md sm:left-8 sm:top-[calc(env(safe-area-inset-top)+1.5rem)] sm:max-w-[min(22rem,calc(100vw-16rem))] ${
                    frontSurfaceTextClass === "text-white"
                      ? "border-white/18 bg-black/24 text-white"
                      : "border-[#d8c8aa]/62 bg-[#fffaf0]/62 text-[#332d25]"
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="truncate text-[10px] font-bold uppercase tracking-[0.18em] opacity-82">
                      {deckLabel}
                    </span>
                    <span className="shrink-0 text-[11px] font-semibold opacity-78">
                      {date}
                    </span>
                  </div>
                  {displayFrontText ? (
                    <p className="mt-1 line-clamp-2 text-left text-sm font-semibold leading-snug opacity-92 sm:text-[15px]">
                      {displayFrontText}
                    </p>
                  ) : null}
                </div>
              </section>
            ) : (
              <section
                aria-label="裏面メモの全画面表示"
                className={`${flipFaceClass} flex cursor-pointer flex-col bg-[#fffaf0] px-3 pt-[calc(env(safe-area-inset-top)+0.5rem)] pointer-events-auto [transform:rotateY(180deg)] sm:px-8 sm:pt-[calc(env(safe-area-inset-top)+1.5rem)] ${backViewBottomPaddingClass}`}
                onClick={handleCardSurfaceClick}
              >
                <header className="mx-auto flex w-full max-w-5xl shrink-0 flex-col gap-1 border-b border-[#e5d6c2] pb-2 sm:flex-row sm:items-end sm:justify-between sm:gap-2 sm:pb-4">
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#9c8a73] sm:text-[11px] sm:tracking-[0.22em]">
                      Back Memo
                    </p>
                    <h2 className="mt-0.5 truncate text-lg font-bold leading-tight text-[#332d25] sm:mt-1 sm:text-3xl">
                      {displayFrontText || "裏面メモ"}
                    </h2>
                  </div>
                  <div className="flex shrink-0 items-center gap-2 text-[11px] font-semibold leading-tight text-[#8c7a62] sm:gap-3 sm:text-xs">
                    <span>{deckLabel}</span>
                    <span>{date}</span>
                  </div>
                </header>
                <div
                  data-card-scroll="true"
                  className="card-detail-back-scroll mx-auto mt-2 min-h-0 w-full max-w-5xl flex-1 overflow-y-auto overscroll-contain rounded-[14px] border border-[#eadcc8] bg-white/54 px-3 py-3 shadow-inner shadow-[#efe3d0]/55 sm:mt-5 sm:rounded-[18px] sm:px-7 sm:py-6"
                  onPointerDown={(event) => event.stopPropagation()}
                  onPointerMove={(event) => event.stopPropagation()}
                  onPointerUp={(event) => event.stopPropagation()}
                  onTouchMove={(event) => event.stopPropagation()}
                  onWheel={(event) => event.stopPropagation()}
                >
                  <MarkdownMemo
                    emptyText="裏面メモがありません"
                    readingDensity="detailBack"
                  >
                    {card.backText ?? ""}
                  </MarkdownMemo>
                  <div aria-hidden="true" className="h-3 sm:h-8" />
                </div>
              </section>
            )}
          </div>
        </div>

        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex flex-col items-center gap-1 bg-gradient-to-t from-[#1b130f]/56 via-[#1b130f]/20 to-transparent px-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-6 sm:gap-2 sm:pb-[calc(env(safe-area-inset-bottom)+0.75rem)] sm:pt-10">
          <div className="pointer-events-auto relative z-50 flex items-center justify-center gap-2 sm:gap-4">
            {isMenuOpen ? (
              <div
                data-card-action="true"
                className="absolute bottom-[calc(100%+0.75rem)] left-0 z-50 w-[min(260px,calc(100vw-1rem))] rounded-2xl border border-[#e0d3c0] bg-[#fffaf0]/96 p-2 text-[#4f4437] shadow-[0_18px_48px_rgba(45,35,24,0.24)] backdrop-blur-md sm:left-1/2 sm:-translate-x-1/2"
                onClick={stopCardActionEvent}
                onPointerDown={(event) => event.stopPropagation()}
                onPointerUp={(event) => event.stopPropagation()}
                onTouchStart={(event) => event.stopPropagation()}
              >
                <div className="flex flex-col gap-1">
                  <button
                    type="button"
                    className={menuItemClass}
                    onClick={(event) => {
                      event.stopPropagation();
                      handleMenuFavorite();
                    }}
                  >
                    {isFavorite ? "お気に入り解除" : "お気に入り"}
                  </button>
                  <button
                    type="button"
                    className={destructiveMenuItemClass}
                    onClick={(event) => {
                      event.stopPropagation();
                      handleMenuDelete();
                    }}
                  >
                    削除
                  </button>
                </div>
              </div>
            ) : null}
            <button
              type="button"
              aria-label="補助操作メニュー"
              aria-expanded={isMenuOpen}
              onClick={(event) => {
                event.stopPropagation();
                toggleMenu();
              }}
              onPointerDown={(event) => {
                event.stopPropagation();
              }}
              onPointerUp={(event) => {
                event.stopPropagation();
              }}
              onTouchStart={(event) => {
                event.stopPropagation();
              }}
              className={shutterButtonClass}
            >
              <span className="flex h-[54px] w-[54px] items-center justify-center rounded-full border-[5px] border-[#fefbf4] bg-[#f0e4d2] text-lg leading-none shadow-inner shadow-white/80 sm:h-[60px] sm:w-[60px]">
                ...
              </span>
            </button>
            <button
              type="button"
              aria-label="前のカードへ"
              disabled={!canNavigateCards}
              onClick={(event) => {
                event.stopPropagation();
                if (canNavigateCards) {
                  showPreviousPhoto();
                }
              }}
              onPointerDown={(event) => {
                event.stopPropagation();
              }}
              onPointerUp={(event) => {
                event.stopPropagation();
              }}
              onTouchStart={(event) => {
                event.stopPropagation();
              }}
              className={`${shutterButtonClass} ${
                canNavigateCards
                  ? ""
                  : "cursor-default opacity-45 hover:scale-100 hover:bg-[#fffaf0]/82"
              }`}
            >
              <span className="flex h-[54px] w-[54px] items-center justify-center rounded-full border-[5px] border-[#fefbf4] bg-[#f0e4d2] text-[11px] leading-none shadow-inner shadow-white/80 sm:h-[60px] sm:w-[60px] sm:text-xs">
                戻る
              </span>
            </button>
            <button
              type="button"
              aria-label={`${nextViewModeLabel}へ`}
              onClick={(event) => {
                event.stopPropagation();
                toggleViewMode();
              }}
              onPointerDown={(event) => {
                event.stopPropagation();
              }}
              onPointerUp={(event) => {
                event.stopPropagation();
              }}
              onTouchStart={(event) => {
                event.stopPropagation();
              }}
              className={shutterButtonClass}
            >
              <span className="flex h-[54px] w-[54px] items-center justify-center rounded-full border-[5px] border-[#fefbf4] bg-[#f0e4d2] text-[11px] leading-none shadow-inner shadow-white/80 sm:h-[60px] sm:w-[60px] sm:text-xs">
                {nextViewModeLabel}
              </span>
            </button>
            <button
              type="button"
              aria-label="次のカードへ"
              disabled={!canNavigateCards}
              onClick={(event) => {
                event.stopPropagation();
                if (canNavigateCards) {
                  showNextPhoto();
                }
              }}
              onPointerDown={(event) => {
                event.stopPropagation();
              }}
              onPointerUp={(event) => {
                event.stopPropagation();
              }}
              onTouchStart={(event) => {
                event.stopPropagation();
              }}
              className={`${shutterButtonClass} ${
                canNavigateCards
                  ? ""
                  : "cursor-default opacity-45 hover:scale-100 hover:bg-[#fffaf0]/82"
              }`}
            >
              <span className="flex h-[54px] w-[54px] items-center justify-center rounded-full border-[5px] border-[#fefbf4] bg-[#f0e4d2] text-[11px] leading-none shadow-inner shadow-white/80 sm:h-[60px] sm:w-[60px] sm:text-xs">
                次へ
              </span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
