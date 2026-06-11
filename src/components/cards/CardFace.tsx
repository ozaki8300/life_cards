import MarkdownMemo from "@/components/MarkdownMemo";
import type { CardImageFitMode } from "@/lib/types";

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
  linkUrl?: string;
  preserve3d?: boolean;
  size: CardFaceSize;
};

const faceSize = {
  tile: {
    rounded: "rounded-[18px]",
    topFade: "h-24",
    label: "left-4 top-4 max-w-[60%] px-3 py-1 text-[11px]",
    frontContent: "px-5 pb-5 pt-5 sm:px-4 sm:pb-4",
    title: "line-clamp-3 text-2xl leading-snug sm:text-xl",
    comment: "line-clamp-3 text-[15px] leading-6 sm:text-sm",
    date: "text-[10px]",
    backContent: "px-5 pb-5 pt-4 sm:px-4 sm:pb-4",
    backMemo: "max-h-[calc(100%-4.75rem)] overflow-hidden text-[15px] leading-5 sm:text-sm sm:leading-6",
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
    backContent: "px-5 pb-5 pt-4 sm:px-7 sm:pb-7 sm:pt-6",
    backMemo: "card-detail-back-scroll overflow-y-auto pr-2 text-base leading-6 sm:text-base sm:leading-7",
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
  linkUrl = "",
  preserve3d = true,
  size,
}: Props) {
  const styles = faceSize[size];
  const backgroundStyle = { backgroundImage: `url(${backgroundImage})` };
  const blurExtendImageStyle = {
    ...backgroundStyle,
    backgroundPosition: "center 35%",
  };
  const isBlurExtend = imageFitMode === "blurExtend";
  const isBack = face === "back";
  const isDocumentFront = isBlurExtend && !isBack;
  const linkHref = normalizeLinkUrl(linkUrl);
  const frontOverlayClass = isDocumentFront
    ? "bg-gradient-to-t from-[#fffaf0]/76 via-[#fffaf0]/34 to-[#fffaf0]/10"
    : "bg-gradient-to-t from-black/56 via-black/18 to-black/5";
  const frontTopFadeClass = isDocumentFront
    ? "bg-gradient-to-b from-[#fffaf0]/46 to-transparent"
    : "bg-gradient-to-b from-black/32 to-transparent";
  const frontLabelClass = isDocumentFront
    ? "bg-white/76 text-[#5f5346] shadow-sm"
    : "bg-black/16 text-white/70 backdrop-blur-sm";
  const frontContentClass = isDocumentFront ? "text-[#2f2a23]" : "text-white";
  const frontDateClass = isDocumentFront
    ? "text-[#5f5346]"
    : "text-white/88 drop-shadow-[0_1px_7px_rgba(0,0,0,0.86)]";
  const frontTitleClass = isDocumentFront
    ? "text-[#231f1a]"
    : "text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.95)]";
  const frontCommentClass = isDocumentFront
    ? "text-[#3b352d]"
    : "text-white/88 drop-shadow-[0_1px_8px_rgba(0,0,0,0.9)]";
  const faceTransform = isBack
    ? preserve3d
      ? "[transform:rotateY(180deg)_translateZ(0)]"
      : "[transform:translateZ(0)]"
    : "[transform:translateZ(0)]";

  return (
    <section
      className={`absolute inset-0 overflow-hidden border bg-center [-webkit-backface-visibility:hidden] [backface-visibility:hidden] ${
        isBlurExtend ? "border-white/45 bg-[#1f1b16]" : "border-white/25 bg-cover"
      } ${
        styles.rounded
      } ${faceTransform}`}
      style={isBlurExtend ? undefined : backgroundStyle}
    >
      {isBlurExtend ? (
        <>
          <div
            className="absolute inset-0 scale-110 bg-cover blur-xl brightness-[0.82]"
            style={blurExtendImageStyle}
          />
          <div
            className="absolute inset-0 bg-contain bg-no-repeat"
            style={blurExtendImageStyle}
          />
        </>
      ) : null}
      {isBack ? <div className="absolute inset-0 backdrop-blur-[1.5px]" /> : null}
      <div
        className={`absolute inset-0 ${
          isBack ? "bg-[#fff7ec]/88" : frontOverlayClass
        }`}
      />
      {!isBack ? (
        <div
          className={`absolute inset-x-0 top-0 ${frontTopFadeClass} ${styles.topFade}`}
        />
      ) : null}

      {!isBack ? (
        <>
          <p
            className={`absolute truncate rounded-full font-semibold uppercase tracking-[0.16em] ${frontLabelClass} ${styles.label}`}
          >
            {deckLabel}
          </p>

          <div
            className={`absolute inset-x-0 bottom-0 ${frontContentClass} ${styles.frontContent}`}
          >
            <p
              className={`font-medium ${frontDateClass} ${styles.date}`}
            >
              {date}
            </p>
            <h3
              className={`mt-3 font-semibold ${frontTitleClass} ${styles.title}`}
            >
              {frontText || "Untitled"}
            </h3>
            {frontComment ? (
              <p
                className={`mt-4 whitespace-pre-line ${frontCommentClass} ${styles.comment}`}
              >
                {frontComment}
              </p>
            ) : null}
          </div>
        </>
      ) : (
        <div
          className={`relative flex h-full min-h-0 flex-col text-[#332d25] ${styles.backContent}`}
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
            className={`mt-3 min-h-0 flex-1 ${styles.backMemo}`}
          >
            <MarkdownMemo
              compact={size !== "detail"}
              emptyText="裏面メモを書く（Markdown対応）"
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
