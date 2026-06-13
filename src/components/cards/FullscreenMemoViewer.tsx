"use client";

import { useEffect } from "react";
import type { MouseEvent } from "react";

import MarkdownMemo from "@/components/MarkdownMemo";
import { useEscapeKey } from "@/lib/useEscapeKey";

type Props = {
  canGoNext?: boolean;
  canGoPrevious?: boolean;
  currentIndex?: number | null;
  memo: string;
  onClose: () => void;
  onNext?: () => void;
  onPrevious?: () => void;
  title?: string;
  totalCount?: number;
};

export default function FullscreenMemoViewer({
  canGoNext = false,
  canGoPrevious = false,
  currentIndex = null,
  memo,
  onClose,
  onNext,
  onPrevious,
  title = "",
  totalCount = 0,
}: Props) {
  useEscapeKey(onClose);

  useEffect(() => {
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverscroll =
      document.documentElement.style.overscrollBehavior;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overscrollBehavior = "none";

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overscrollBehavior =
        previousHtmlOverscroll;
    };
  }, []);

  function handleViewerClick(event: MouseEvent<HTMLDivElement>) {
    event.stopPropagation();

    if (event.target === event.currentTarget) {
      onClose();
    }
  }

  const shouldShowNavigation = totalCount > 1;
  const currentPositionLabel =
    currentIndex !== null && totalCount > 0
      ? `${currentIndex + 1} / ${totalCount}`
      : "";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="裏面メモ全文"
      className="pointer-events-auto fixed inset-0 z-[80] h-[100dvh] w-screen overflow-hidden bg-[#2f281f]/48 px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-[calc(env(safe-area-inset-top)+0.75rem)] text-[#332d25] backdrop-blur-sm sm:px-6 sm:py-6"
      onClick={handleViewerClick}
      onPointerCancel={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
      onPointerMove={(event) => event.stopPropagation()}
      onPointerUp={(event) => event.stopPropagation()}
      onTouchEnd={(event) => event.stopPropagation()}
      onTouchMove={(event) => event.stopPropagation()}
      onTouchStart={(event) => event.stopPropagation()}
    >
      <section
        className="mx-auto flex h-full w-full max-w-4xl flex-col overflow-hidden rounded-[22px] border border-[#e0d3c0]/72 bg-[#fffaf0]/96 shadow-[0_24px_80px_rgba(42,32,22,0.28)]"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex min-h-[64px] shrink-0 items-center justify-between gap-3 border-b border-[#e7dccb]/80 bg-[#fffaf0]/90 px-4 py-3 sm:px-6">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8a7a65]">
              Back memo
            </p>
            {title.trim() ? (
              <h2 className="mt-1 truncate text-base font-semibold leading-tight text-[#332d25] sm:text-xl">
                {title}
              </h2>
            ) : null}
          </div>
          <button
            type="button"
            aria-label="閉じる"
            onClick={(event) => {
              event.stopPropagation();
              onClose();
            }}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#d8c8aa]/70 bg-white/72 text-2xl leading-none text-[#5f5346] shadow-[0_8px_22px_rgba(87,72,52,0.12)] transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-[#d8c8aa]"
          >
            <span aria-hidden="true" className="-translate-y-px">
              ×
            </span>
          </button>
        </header>

        <div className="card-detail-back-scroll min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-8 sm:py-8">
          <div className="mx-auto max-w-3xl text-[16px] leading-8 sm:text-lg sm:leading-9">
            <MarkdownMemo emptyText="裏面メモがありません" readingDensity="default">
              {memo}
            </MarkdownMemo>
          </div>
        </div>

        {shouldShowNavigation ? (
          <footer className="shrink-0 border-t border-[#e7dccb]/80 bg-[#fffaf0]/92 px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] sm:px-6 sm:pb-4">
            <div className="mx-auto flex max-w-sm items-center justify-center gap-5">
              <button
                type="button"
                aria-label="前のカードの裏面メモへ"
                disabled={!canGoPrevious}
                onClick={(event) => {
                  event.stopPropagation();
                  onPrevious?.();
                }}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-[#d8c8aa]/70 bg-white/70 text-3xl leading-none text-[#5f5346] shadow-[0_8px_20px_rgba(87,72,52,0.12)] transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-[#d8c8aa] active:scale-95 disabled:cursor-default disabled:opacity-35"
              >
                <span aria-hidden="true" className="-translate-y-px">
                  ‹
                </span>
              </button>
              <p className="min-w-[5.5rem] text-center text-sm font-semibold tabular-nums text-[#6f6253]">
                {currentPositionLabel}
              </p>
              <button
                type="button"
                aria-label="次のカードの裏面メモへ"
                disabled={!canGoNext}
                onClick={(event) => {
                  event.stopPropagation();
                  onNext?.();
                }}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-[#d8c8aa]/70 bg-white/70 text-3xl leading-none text-[#5f5346] shadow-[0_8px_20px_rgba(87,72,52,0.12)] transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-[#d8c8aa] active:scale-95 disabled:cursor-default disabled:opacity-35"
              >
                <span aria-hidden="true" className="-translate-y-px">
                  ›
                </span>
              </button>
            </div>
          </footer>
        ) : null}
      </section>
    </div>
  );
}
