import MarkdownMemo from "@/components/MarkdownMemo";
import type { CardImageFitMode, DefaultCardImageKey } from "@/lib/types";

import { defaultImageForCard, formatDate } from "./cardUiUtils";

const blurExtendImageFadeClass =
  "absolute left-1/2 top-1/2 max-h-full max-w-full -translate-x-1/2 -translate-y-1/2 object-contain [mask-image:linear-gradient(to_bottom,transparent_0,black_32px,black_calc(100%-32px),transparent_100%)] [-webkit-mask-image:linear-gradient(to_bottom,transparent_0,black_32px,black_calc(100%-32px),transparent_100%)]";
const blurExtendPreviewTextReserveClass = {
  commentOnly: "min-h-[6.5rem]",
  full: "min-h-[11.5rem]",
  titleOnly: "min-h-[7.75rem]",
} as const;
const blurExtendPreviewTextAnchoredImageClass = {
  commentOnly:
    "absolute bottom-[calc(6.5rem-0.625rem)] left-1/2 max-h-[64%] max-w-[calc(100%-1.5rem)] -translate-x-1/2 object-contain [mask-image:linear-gradient(to_bottom,transparent_0,black_28px,black_calc(100%-20px),transparent_100%)] [-webkit-mask-image:linear-gradient(to_bottom,transparent_0,black_28px,black_calc(100%-20px),transparent_100%)]",
  full:
    "absolute bottom-[calc(11.5rem-0.625rem)] left-1/2 max-h-[54%] max-w-[calc(100%-1.5rem)] -translate-x-1/2 object-contain [mask-image:linear-gradient(to_bottom,transparent_0,black_28px,black_calc(100%-20px),transparent_100%)] [-webkit-mask-image:linear-gradient(to_bottom,transparent_0,black_28px,black_calc(100%-20px),transparent_100%)]",
  titleOnly:
    "absolute bottom-[calc(7.75rem-0.625rem)] left-1/2 max-h-[60%] max-w-[calc(100%-1.5rem)] -translate-x-1/2 object-contain [mask-image:linear-gradient(to_bottom,transparent_0,black_28px,black_calc(100%-20px),transparent_100%)] [-webkit-mask-image:linear-gradient(to_bottom,transparent_0,black_28px,black_calc(100%-20px),transparent_100%)]",
} as const;

type Props = {
  backText: string;
  cardDate: string;
  defaultImageKey?: DefaultCardImageKey;
  frontComment: string;
  frontText: string;
  imageFitMode?: CardImageFitMode;
  imagePath: string;
  linkUrl: string;
  onPreviewFaceChange: (face: "front" | "back") => void;
  previewFace: "front" | "back";
  selectedDeckName: string;
};

type PreviewFaceProps = {
  backgroundImage: string;
  backText: string;
  date: string;
  deckLabel: string;
  face: "front" | "back";
  frontComment: string;
  frontText: string;
  imageFitMode?: CardImageFitMode;
  linkUrl: string;
  useCssPaperBackground?: boolean;
};

function PreviewFace({
  backgroundImage,
  backText,
  date,
  deckLabel,
  face,
  frontComment,
  frontText,
  imageFitMode = "cover",
  linkUrl,
  useCssPaperBackground = false,
}: PreviewFaceProps) {
  const isBack = face === "back";
  const isBlurExtend = imageFitMode === "blurExtend";
  const isPaperDefault =
    useCssPaperBackground || backgroundImage.includes("default-paper.webp");
  const isDocumentFront = isBlurExtend && !useCssPaperBackground && !isBack;
  const isPaperFront = isPaperDefault && !isBack;
  const isLightFront = isDocumentFront || isPaperFront;
  const trimmedLinkUrl = linkUrl.trim();
  const frontOverlayClass = isDocumentFront
    ? "bg-gradient-to-t from-[#fffaf0]/28 via-[#fffaf0]/5 to-transparent"
    : isPaperFront
      ? "bg-transparent"
    : "bg-gradient-to-t from-black/60 via-black/18 to-black/5";
  const frontTopFadeClass = isDocumentFront
    ? "bg-gradient-to-b from-[#fffaf0]/4 to-transparent"
    : isPaperFront
      ? "bg-transparent"
    : "bg-gradient-to-b from-black/32 to-transparent";
  const frontLabelClass = isLightFront
    ? "bg-[#fffaf0]/54 text-[#5f5346] shadow-sm"
    : "bg-black/24 text-white/78";
  const frontContentClass = isLightFront ? "text-[#2f2a23]" : "text-white";
  const frontDateClass = isLightFront
    ? "text-[#5f5346] drop-shadow-[0_1px_3px_rgba(255,250,240,0.78)]"
    : "text-white/90";
  const frontTitleClass = isLightFront
    ? "text-[#231f1a] drop-shadow-[0_1px_4px_rgba(255,250,240,0.82)]"
    : "text-white";
  const frontCommentClass = isLightFront
    ? "text-[#3b352d] drop-shadow-[0_1px_3px_rgba(255,250,240,0.78)]"
    : "text-white/90";
  const displayFrontText = frontText.trim();
  const displayFrontComment = frontComment.trim();
  const hasFrontTitle = Boolean(displayFrontText);
  const hasFrontComment = Boolean(displayFrontComment);
  const documentTextLayoutVariant = hasFrontTitle
    ? hasFrontComment
      ? "full"
      : "titleOnly"
    : "commentOnly";
  const hasDocumentFrontText =
    isDocumentFront && (hasFrontTitle || hasFrontComment);
  const frontContentReserveClass = hasDocumentFrontText
    ? blurExtendPreviewTextReserveClass[documentTextLayoutVariant]
    : "";
  const blurExtendImageClass = hasDocumentFrontText
    ? blurExtendPreviewTextAnchoredImageClass[documentTextLayoutVariant]
    : blurExtendImageFadeClass;
  const frontTitleClampClass = isDocumentFront ? "line-clamp-2" : "line-clamp-3";
  const frontCommentClampClass = isDocumentFront ? "line-clamp-2" : "";
  const backgroundStyle = {
    backgroundImage: `url(${backgroundImage})`,
  };
  const baseBackgroundClass = isPaperDefault
    ? "bg-[#f7f3ea]"
    : "bg-[#f6efe4]";
  const blurExtendImageStyle = {
    ...backgroundStyle,
    backgroundPosition: "center 35%",
  };

  return (
    <div
      className={`absolute inset-0 isolate overflow-hidden rounded-[22px] border ${baseBackgroundClass} ${
        isBlurExtend ? `border-[#f3eadb]/70 ${baseBackgroundClass}` : "border-[#f3eadb]/42"
      }`}
    >
      {isBlurExtend && !useCssPaperBackground ? (
        <>
          <div
            className="absolute inset-0 z-0 scale-110 bg-cover opacity-30 blur-2xl brightness-[1.12] saturate-[0.72]"
            style={blurExtendImageStyle}
          />
          <div className="absolute inset-0 z-[1] bg-[#fff7ec]/38" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt=""
            aria-hidden="true"
            className={`${blurExtendImageClass} z-[3]`}
            src={backgroundImage}
          />
        </>
      ) : useCssPaperBackground ? null : (
        <div
          className="absolute inset-0 z-0 bg-cover bg-center"
          style={backgroundStyle}
        />
      )}
      <div
        className={`absolute inset-0 z-[2] ${
          isBack ? "bg-[#f5ecdf]/88" : frontOverlayClass
        }`}
      />
      {!isBack ? (
        <div className={`absolute inset-x-0 top-0 z-[4] h-28 ${frontTopFadeClass}`} />
      ) : null}

      {!isBack ? (
        <>
          <p
            className={`absolute left-5 top-5 z-10 max-w-[70%] truncate rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${frontLabelClass}`}
          >
            {deckLabel}
          </p>

          <div
            className={`absolute inset-x-0 bottom-0 z-10 px-5 pb-6 pt-5 ${frontContentClass} ${frontContentReserveClass}`}
          >
            <p className={`text-xs font-medium ${frontDateClass}`}>{date}</p>
            {hasFrontTitle ? (
              <h3
                className={`mt-3 ${frontTitleClampClass} text-3xl font-semibold leading-tight ${frontTitleClass}`}
              >
                {displayFrontText}
              </h3>
            ) : null}
            {hasFrontComment ? (
              <p
                className={`${
                  hasFrontTitle ? "mt-4" : "mt-3"
                } whitespace-pre-line text-sm leading-6 ${frontCommentClass} ${frontCommentClampClass}`}
              >
                {displayFrontComment}
              </p>
            ) : null}
          </div>
        </>
      ) : (
        <div className="relative z-10 flex h-full min-h-0 flex-col px-5 pb-5 pt-4 text-[#332d25]">
          <div className="flex items-center justify-between gap-3 pr-12">
            <p className="max-w-[55%] truncate rounded-full bg-white/70 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#6f6253]">
              {deckLabel}
            </p>
            <p className="shrink-0 whitespace-nowrap text-xs font-medium text-[#7d705f]">
              {date}
            </p>
          </div>

          <div className="card-back-scroll mt-3 min-h-0 flex-1 overflow-y-auto pr-2 text-sm leading-6">
            <MarkdownMemo compact emptyText="裏面メモを書く（Markdown対応）">
              {backText}
            </MarkdownMemo>
          </div>
          {trimmedLinkUrl ? (
            <span className="mt-3 block shrink-0 truncate rounded-full border border-[#d8c8aa] bg-white/70 px-3 py-2 text-xs font-semibold text-[#6f6253]">
              {trimmedLinkUrl}
            </span>
          ) : null}
        </div>
      )}
    </div>
  );
}

export default function CardFormPreview({
  backText,
  cardDate,
  defaultImageKey,
  frontComment,
  frontText,
  imageFitMode = "cover",
  imagePath,
  linkUrl,
  onPreviewFaceChange,
  previewFace,
  selectedDeckName,
}: Props) {
  const previewBackground =
    imagePath || defaultImageForCard({ defaultImageKey });
  const useCssPaperBackground = !imagePath && defaultImageKey === "paper";
  const date = formatDate(cardDate);
  const isBack = previewFace === "back";
  const previewShadowClass =
    imageFitMode === "blurExtend"
      ? "shadow-[0_22px_58px_rgba(126,107,82,0.16)]"
      : "shadow-[0_20px_54px_rgba(87,72,52,0.24)]";

  return (
    <section className="mx-auto w-full max-w-[300px] sm:max-w-[340px] lg:sticky lg:top-4 lg:max-w-[360px]">
      <button
        type="button"
        onClick={() => onPreviewFaceChange(isBack ? "front" : "back")}
        className={`group relative block aspect-[3/4] w-full cursor-pointer overflow-hidden rounded-[22px] text-left focus:outline-none focus:ring-2 focus:ring-[#d8c8aa] focus:ring-offset-2 focus:ring-offset-[#fffaf0] ${previewShadowClass}`}
        aria-label={isBack ? "表面プレビューを表示" : "裏面プレビューを表示"}
      >
        <PreviewFace
          backgroundImage={previewBackground}
          backText={backText}
          date={date}
          deckLabel={selectedDeckName}
          face={isBack ? "back" : "front"}
          frontComment={frontComment}
          frontText={frontText}
          imageFitMode={imageFitMode}
          linkUrl={linkUrl}
          useCssPaperBackground={useCssPaperBackground}
        />
      </button>
    </section>
  );
}
