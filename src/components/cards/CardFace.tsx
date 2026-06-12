"use client";

import type { TouchEvent, WheelEvent } from "react";

import MarkdownMemo from "@/components/MarkdownMemo";
import type { CardImageFitMode, CardImageFrameMode } from "@/lib/types";

type CardFaceSize = "tile" | "preview" | "detail";

type Props = {
  backgroundImage: string;
  backText?: string;
  date: string;
  deckLabel: string;
  face: "front" | "back";
  frontComment?: string;
  frontText?: string;
  imageFitMode?: CardImageFitMode;
  imageFrameMode?: CardImageFrameMode;
  linkUrl?: string;
  preserve3d?: boolean;
  size: CardFaceSize;
};

const faceSize = {
  tile: {
    rounded: "rounded-[18px]",
    topFade: "h-24",
    label: "left-4 top-4 max-w-[60%] px-3 py-1 text-[11px]",
    frontContent: "px-5 pb-5 pr-16 pt-5 sm:px-4 sm:pb-4 sm:pr-14",
    title: "line-clamp-2 break-words text-[1.42rem] leading-[1.15] [overflow-wrap:anywhere] sm:text-[1.18rem] sm:leading-[1.16]",
    comment: "line-clamp-2 text-[15px] leading-6 sm:text-sm",
    date: "text-[10px]",
    backContent: "px-5 pb-5 pt-4 sm:px-4 sm:pb-4",
    backMemo: "max-h-[calc(100%-4.75rem)] overflow-hidden pr-2 text-[15px] leading-5 sm:text-sm sm:leading-6",
  },
  preview: {
    rounded: "rounded-[22px]",
    topFade: "h-28",
    label: "left-5 top-5 max-w-[70%] px-3 py-1 text-[11px]",
    frontContent: "px-5 pb-6 pt-5",
    title: "line-clamp-3 text-3xl leading-tight",
    comment: "text-sm leading-6",
    date: "text-xs",
    backContent: "px-5 pb-5 pt-4",
    backMemo: "card-back-scroll overflow-y-auto pr-2 text-sm leading-5 sm:leading-6",
  },
  detail: {
    rounded: "rounded-[24px]",
    topFade: "h-28 sm:h-32",
    label: "left-5 top-5 max-w-[70%] px-3 py-1 text-[10px] sm:left-7 sm:top-8 sm:text-[11px]",
    frontContent: "px-5 pb-6 pt-6 sm:px-7 sm:pb-9 sm:pt-8",
    title: "text-[1.65rem] leading-tight sm:text-4xl",
    comment: "text-sm leading-6 sm:text-base sm:leading-7",
    date: "text-[11px] sm:text-xs",
    backContent: "px-4 pb-4 pt-3 sm:px-7 sm:pb-7 sm:pt-6",
    backMemo: "card-detail-back-scroll overflow-y-auto pb-10 pr-1.5 text-[15px] leading-[1.7] sm:pr-2 sm:text-base sm:leading-7",
  },
} as const;

const blurExtendImageFadeClass = {
  detail:
    "absolute left-1/2 top-1/2 max-h-full max-w-full -translate-x-1/2 -translate-y-1/2 object-contain brightness-[1.01] contrast-[1.04] [mask-image:linear-gradient(to_bottom,transparent_0,black_32px,black_calc(100%-32px),transparent_100%)] [-webkit-mask-image:linear-gradient(to_bottom,transparent_0,black_32px,black_calc(100%-32px),transparent_100%)]",
  preview:
    "absolute left-1/2 top-1/2 max-h-full max-w-full -translate-x-1/2 -translate-y-1/2 object-contain brightness-[1.01] contrast-[1.04] [mask-image:linear-gradient(to_bottom,transparent_0,black_32px,black_calc(100%-32px),transparent_100%)] [-webkit-mask-image:linear-gradient(to_bottom,transparent_0,black_32px,black_calc(100%-32px),transparent_100%)]",
  tile:
    "absolute left-1/2 top-1/2 max-h-full max-w-full -translate-x-1/2 -translate-y-1/2 object-contain brightness-[1.01] contrast-[1.05] [mask-image:linear-gradient(to_bottom,transparent_0,black_20px,black_calc(100%-20px),transparent_100%)] [-webkit-mask-image:linear-gradient(to_bottom,transparent_0,black_20px,black_calc(100%-20px),transparent_100%)]",
} as const;
const blurExtendBackgroundWashClass = {
  detail: "absolute inset-0 z-[1] bg-[#fff7ec]/34",
  preview: "absolute inset-0 z-[1] bg-[#fff7ec]/34",
  tile: "absolute inset-0 z-[1] bg-[#fff7ec]/22",
} as const;
const blurExtendFrontOverlayClass = {
  detail: "bg-gradient-to-t from-[#fffaf0]/28 via-[#fffaf0]/5 to-transparent",
  preview: "bg-gradient-to-t from-[#fffaf0]/28 via-[#fffaf0]/5 to-transparent",
  tile: "bg-gradient-to-t from-[#fffaf0]/20 via-[#fffaf0]/3 to-transparent",
} as const;
const blurExtendTopFadeClass = {
  detail: "bg-gradient-to-b from-[#fffaf0]/4 to-transparent",
  preview: "bg-gradient-to-b from-[#fffaf0]/4 to-transparent",
  tile: "bg-gradient-to-b from-[#fffaf0]/2 to-transparent",
} as const;
const blurExtendPaperFrameClass = {
  detail:
    "absolute inset-3 z-[2] rounded-[20px] border border-white/74 bg-[#fffefa]/92 shadow-[0_18px_42px_rgba(87,72,52,0.18)]",
  preview:
    "absolute inset-2 z-[2] rounded-[18px] border border-white/74 bg-[#fffefa]/92 shadow-[0_18px_42px_rgba(87,72,52,0.18)]",
  tile:
    "absolute inset-1.5 z-[2] rounded-[14px] border border-white/74 bg-[#fffefa]/92 shadow-[0_12px_28px_rgba(87,72,52,0.16)]",
} as const;
const paperFrontOverlayClass = {
  detail: "bg-transparent",
  preview: "bg-transparent",
  tile: "bg-transparent",
} as const;
const paperTopFadeClass = {
  detail: "bg-transparent",
  preview: "bg-transparent",
  tile: "bg-transparent",
} as const;
const backWatermarkOverlayClass = {
  detail: "bg-[#fffaf0]/76",
  preview: "bg-[#fffaf0]/74",
  tile: "bg-[#fffaf0]/72",
} as const;
type TextLayoutVariant = "commentOnly" | "full" | "titleOnly";

const blurExtendTextReserveClass = {
  detail: {
    commentOnly: "min-h-[7.75rem]",
    full: "min-h-[13.75rem]",
    titleOnly: "min-h-[9.5rem]",
  },
  preview: {
    commentOnly: "min-h-[6.5rem]",
    full: "min-h-[11.5rem]",
    titleOnly: "min-h-[7.75rem]",
  },
  tile: {
    commentOnly: "min-h-[5.25rem]",
    full: "min-h-[8.75rem]",
    titleOnly: "min-h-[6.25rem]",
  },
} as const;

const blurExtendTextAnchoredImageClass = {
  detail: {
    commentOnly:
      "absolute bottom-[calc(7.75rem-0.875rem)] left-1/2 max-h-[64%] max-w-[calc(100%-2rem)] -translate-x-1/2 object-contain brightness-[1.01] contrast-[1.04] [mask-image:linear-gradient(to_bottom,transparent_0,black_32px,black_calc(100%-24px),transparent_100%)] [-webkit-mask-image:linear-gradient(to_bottom,transparent_0,black_32px,black_calc(100%-24px),transparent_100%)]",
    full:
      "absolute bottom-[calc(13.75rem-0.875rem)] left-1/2 max-h-[54%] max-w-[calc(100%-2rem)] -translate-x-1/2 object-contain brightness-[1.01] contrast-[1.04] [mask-image:linear-gradient(to_bottom,transparent_0,black_32px,black_calc(100%-24px),transparent_100%)] [-webkit-mask-image:linear-gradient(to_bottom,transparent_0,black_32px,black_calc(100%-24px),transparent_100%)]",
    titleOnly:
      "absolute bottom-[calc(9.5rem-0.875rem)] left-1/2 max-h-[60%] max-w-[calc(100%-2rem)] -translate-x-1/2 object-contain brightness-[1.01] contrast-[1.04] [mask-image:linear-gradient(to_bottom,transparent_0,black_32px,black_calc(100%-24px),transparent_100%)] [-webkit-mask-image:linear-gradient(to_bottom,transparent_0,black_32px,black_calc(100%-24px),transparent_100%)]",
  },
  preview: {
    commentOnly:
      "absolute bottom-[calc(6.5rem-0.625rem)] left-1/2 max-h-[64%] max-w-[calc(100%-1.5rem)] -translate-x-1/2 object-contain brightness-[1.01] contrast-[1.04] [mask-image:linear-gradient(to_bottom,transparent_0,black_28px,black_calc(100%-20px),transparent_100%)] [-webkit-mask-image:linear-gradient(to_bottom,transparent_0,black_28px,black_calc(100%-20px),transparent_100%)]",
    full:
      "absolute bottom-[calc(11.5rem-0.625rem)] left-1/2 max-h-[54%] max-w-[calc(100%-1.5rem)] -translate-x-1/2 object-contain brightness-[1.01] contrast-[1.04] [mask-image:linear-gradient(to_bottom,transparent_0,black_28px,black_calc(100%-20px),transparent_100%)] [-webkit-mask-image:linear-gradient(to_bottom,transparent_0,black_28px,black_calc(100%-20px),transparent_100%)]",
    titleOnly:
      "absolute bottom-[calc(7.75rem-0.625rem)] left-1/2 max-h-[60%] max-w-[calc(100%-1.5rem)] -translate-x-1/2 object-contain brightness-[1.01] contrast-[1.04] [mask-image:linear-gradient(to_bottom,transparent_0,black_28px,black_calc(100%-20px),transparent_100%)] [-webkit-mask-image:linear-gradient(to_bottom,transparent_0,black_28px,black_calc(100%-20px),transparent_100%)]",
  },
  tile: {
    commentOnly:
      "absolute bottom-[calc(5.25rem-0.625rem)] left-1/2 max-h-[64%] max-w-[calc(100%-1.5rem)] -translate-x-1/2 object-contain brightness-[1.01] contrast-[1.05] [mask-image:linear-gradient(to_bottom,transparent_0,black_20px,black_calc(100%-16px),transparent_100%)] [-webkit-mask-image:linear-gradient(to_bottom,transparent_0,black_20px,black_calc(100%-16px),transparent_100%)]",
    full:
      "absolute bottom-[calc(8.75rem-0.625rem)] left-1/2 max-h-[56%] max-w-[calc(100%-1.5rem)] -translate-x-1/2 object-contain brightness-[1.01] contrast-[1.05] [mask-image:linear-gradient(to_bottom,transparent_0,black_20px,black_calc(100%-16px),transparent_100%)] [-webkit-mask-image:linear-gradient(to_bottom,transparent_0,black_20px,black_calc(100%-16px),transparent_100%)]",
    titleOnly:
      "absolute bottom-[calc(6.25rem-0.625rem)] left-1/2 max-h-[62%] max-w-[calc(100%-1.5rem)] -translate-x-1/2 object-contain brightness-[1.01] contrast-[1.05] [mask-image:linear-gradient(to_bottom,transparent_0,black_20px,black_calc(100%-16px),transparent_100%)] [-webkit-mask-image:linear-gradient(to_bottom,transparent_0,black_20px,black_calc(100%-16px),transparent_100%)]",
  },
} as const;

function normalizeLinkUrl(linkUrl: string) {
  const trimmed = linkUrl.trim();

  if (!trimmed) {
    return "";
  }

  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export default function CardFace({
  backgroundImage,
  backText = "",
  date,
  deckLabel,
  face,
  frontComment = "",
  frontText = "",
  imageFitMode = "cover",
  imageFrameMode = "none",
  linkUrl = "",
  preserve3d = true,
  size,
}: Props) {
  const styles = faceSize[size];
  const backgroundStyle = { backgroundImage: `url(${backgroundImage})` };
  const blurExtendImageStyle = {
    ...backgroundStyle,
    backgroundPosition: "center 30%",
  };
  const isBlurExtend = imageFitMode === "blurExtend";
  const isBack = face === "back";
  const isPaperDefault = backgroundImage.includes("default-paper.webp");
  const useCssPaperBackground = isPaperDefault;
  const isDocumentFront = isBlurExtend && !useCssPaperBackground && !isBack;
  const hasPaperFrame = isDocumentFront && imageFrameMode === "paper";
  const isPaperFront = isPaperDefault && !isBack;
  const isLightFront = isDocumentFront || isPaperFront;
  const displayFrontText = frontText.trim();
  const displayFrontComment = frontComment.trim();
  const hasFrontTitle = Boolean(displayFrontText);
  const hasFrontComment = Boolean(displayFrontComment);
  const linkHref = normalizeLinkUrl(linkUrl);
  const frontOverlayClass = isDocumentFront
    ? blurExtendFrontOverlayClass[size]
    : isPaperFront
      ? paperFrontOverlayClass[size]
      : "bg-gradient-to-t from-black/56 via-black/18 to-black/5";
  const frontTopFadeClass = isDocumentFront
    ? blurExtendTopFadeClass[size]
    : isPaperFront
      ? paperTopFadeClass[size]
      : "bg-gradient-to-b from-black/32 to-transparent";
  const frontLabelClass = isLightFront
    ? "bg-[#fffaf0]/54 text-[#5f5346] shadow-sm"
    : "bg-black/16 text-white/70 backdrop-blur-sm";
  const frontContentClass = isLightFront ? "text-[#2f2a23]" : "text-white";
  const frontDateClass = isLightFront
    ? "text-[#5f5346] drop-shadow-[0_1px_3px_rgba(255,250,240,0.78)]"
    : "text-white/88 drop-shadow-[0_1px_7px_rgba(0,0,0,0.86)]";
  const frontTitleClass = isLightFront
    ? "text-[#231f1a] drop-shadow-[0_1px_4px_rgba(255,250,240,0.82)]"
    : "text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.95)]";
  const frontCommentClass = isLightFront
    ? "text-[#3b352d] drop-shadow-[0_1px_3px_rgba(255,250,240,0.78)]"
    : "text-white/88 drop-shadow-[0_1px_8px_rgba(0,0,0,0.9)]";
  const frontTitleWeightClass = "font-semibold";
  const hasDocumentFrontText =
    isDocumentFront && (hasFrontTitle || hasFrontComment);
  const documentTextLayoutVariant: TextLayoutVariant = hasFrontTitle
    ? hasFrontComment
      ? "full"
      : "titleOnly"
    : "commentOnly";
  const frontContentReserveClass = hasDocumentFrontText
    ? blurExtendTextReserveClass[size][documentTextLayoutVariant]
    : "";
  const blurExtendImageClass = hasDocumentFrontText
    ? blurExtendTextAnchoredImageClass[size][documentTextLayoutVariant]
    : blurExtendImageFadeClass[size];
  const frontTitleClampClass = isDocumentFront ? "line-clamp-2" : "";
  const frontCommentClampClass = isDocumentFront ? "line-clamp-2" : "";
  const baseBackgroundClass = isPaperDefault
    ? "bg-[#f7f3ea]"
    : "bg-[#f6efe4]";
  const faceTransform = isBack
    ? preserve3d
      ? "[transform:rotateY(180deg)_translateZ(0)]"
      : "[transform:translateZ(0)]"
    : "[transform:translateZ(0)]";
  const backMemoTopMarginClass = size === "detail" ? "mt-2" : "mt-3";

  function isScrollableBackMemo(element: HTMLElement) {
    return element.scrollHeight > element.clientHeight;
  }

  function handleBackMemoTouch(event: TouchEvent<HTMLDivElement>) {
    if (
      isBack &&
      size === "detail" &&
      isScrollableBackMemo(event.currentTarget)
    ) {
      event.stopPropagation();
    }
  }

  function handleBackMemoWheel(event: WheelEvent<HTMLDivElement>) {
    if (
      isBack &&
      size === "detail" &&
      isScrollableBackMemo(event.currentTarget)
    ) {
      event.stopPropagation();
    }
  }

  return (
    <section
      className={`absolute inset-0 overflow-hidden border bg-center [-webkit-backface-visibility:hidden] [backface-visibility:hidden] ${
        isBlurExtend && !useCssPaperBackground && !isBack
          ? `border-[#f3eadb]/70 ${baseBackgroundClass}`
          : `border-[#f3eadb]/42 ${baseBackgroundClass} ${
              useCssPaperBackground ? "" : "bg-cover"
            }`
      } ${
        styles.rounded
      } ${faceTransform}`}
      style={
        isBack || isBlurExtend || useCssPaperBackground
          ? undefined
          : backgroundStyle
      }
    >
      {isBack && !useCssPaperBackground ? (
        isBlurExtend ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            alt=""
            aria-hidden="true"
            className="absolute left-1/2 top-1/2 z-0 max-h-full max-w-full -translate-x-1/2 -translate-y-1/2 object-contain object-[center_40%] opacity-[0.34] saturate-[0.9] contrast-[1.03]"
            src={backgroundImage}
          />
        ) : (
          <div
            className="absolute inset-0 z-0 bg-cover bg-center opacity-[0.34] saturate-[0.9] contrast-[1.03]"
            style={backgroundStyle}
          />
        )
      ) : null}
      {isBlurExtend && !useCssPaperBackground && !isBack ? (
        <>
          <div
            className="absolute inset-0 z-0 scale-110 bg-cover opacity-30 blur-2xl brightness-[1.12] saturate-[0.72]"
            style={blurExtendImageStyle}
          />
          <div className={blurExtendBackgroundWashClass[size]} />
          {hasPaperFrame ? (
            <div className={blurExtendPaperFrameClass[size]} />
          ) : null}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt=""
            aria-hidden="true"
            className={`${blurExtendImageClass} z-[3]`}
            src={backgroundImage}
          />
        </>
      ) : null}
      <div
        className={`absolute inset-0 z-[2] ${
          isBack ? backWatermarkOverlayClass[size] : frontOverlayClass
        }`}
      />
      {!isBack ? (
        <div
          className={`absolute inset-x-0 top-0 z-[4] ${frontTopFadeClass} ${styles.topFade}`}
        />
      ) : null}

      {!isBack ? (
        <>
          <p
            className={`absolute z-[5] truncate rounded-full font-semibold uppercase tracking-[0.16em] ${frontLabelClass} ${styles.label}`}
          >
            {deckLabel}
          </p>

          <div
            className={`absolute inset-x-0 bottom-0 z-[5] ${frontContentClass} ${styles.frontContent} ${frontContentReserveClass}`}
          >
            <p
              className={`font-medium ${frontDateClass} ${styles.date}`}
            >
              {date}
            </p>
            {hasFrontTitle ? (
              <h3
                className={`mt-3 ${frontTitleWeightClass} ${frontTitleClass} ${styles.title} ${frontTitleClampClass}`}
              >
                {displayFrontText}
              </h3>
            ) : null}
            {hasFrontComment ? (
              <p
                className={`${
                  hasFrontTitle ? "mt-4" : "mt-3"
                } whitespace-pre-line ${frontCommentClass} ${styles.comment} ${frontCommentClampClass}`}
              >
                {displayFrontComment}
              </p>
            ) : null}
          </div>
        </>
      ) : (
        <div
          className={`relative z-[5] flex h-full min-h-0 flex-col text-[#332d25] ${styles.backContent}`}
        >
          <div className="flex items-center justify-between gap-3 pr-12">
            <p className="max-w-[55%] truncate rounded-full bg-white/54 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#6f6253] backdrop-blur-sm">
              {deckLabel}
            </p>
            <p
              className={`shrink-0 whitespace-nowrap font-medium text-[#7d705f] ${styles.date}`}
            >
              {date}
            </p>
          </div>

          <div
            onTouchEnd={handleBackMemoTouch}
            onTouchMove={handleBackMemoTouch}
            onTouchStart={handleBackMemoTouch}
            onWheel={handleBackMemoWheel}
            className={`${backMemoTopMarginClass} min-h-0 flex-1 ${styles.backMemo}`}
          >
            <MarkdownMemo
              compact={size !== "detail"}
              emptyText="裏面メモを書く（Markdown対応）"
              readingDensity={size === "detail" ? "detailBack" : "default"}
            >
              {backText}
            </MarkdownMemo>
          </div>
          {linkHref ? (
            <a
              href={linkHref}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(event) => event.stopPropagation()}
              className="mt-2.5 inline-flex min-h-[44px] max-w-full shrink-0 items-center self-start truncate rounded-full border border-[#d8c8aa]/45 bg-white/28 px-2.5 py-1.5 text-xs font-semibold text-[#8a6410] transition hover:border-[#d8c8aa]/70 hover:bg-white/44 focus:outline-none focus:ring-2 focus:ring-[#d8c8aa]"
            >
              Open link ↗
            </a>
          ) : null}
        </div>
      )}
    </section>
  );
}
