import MarkdownMemo from "@/components/MarkdownMemo";
import type { CardImageFitMode } from "@/lib/types";

import { defaultImageForCard, formatDate } from "./cardUiUtils";

type Props = {
  backText: string;
  cardDate: string;
  cardId: string;
  defaultImageSeed?: string;
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
}: PreviewFaceProps) {
  const isBack = face === "back";
  const isBlurExtend = imageFitMode === "blurExtend";
  const isDocumentFront = isBlurExtend && !isBack;
  const trimmedLinkUrl = linkUrl.trim();
  const frontOverlayClass = isDocumentFront
    ? "bg-gradient-to-t from-[#fffaf0]/76 via-[#fffaf0]/34 to-[#fffaf0]/10"
    : "bg-gradient-to-t from-black/60 via-black/18 to-black/5";
  const frontTopFadeClass = isDocumentFront
    ? "bg-gradient-to-b from-[#fffaf0]/46 to-transparent"
    : "bg-gradient-to-b from-black/32 to-transparent";
  const frontLabelClass = isDocumentFront
    ? "bg-white/76 text-[#5f5346] shadow-sm"
    : "bg-black/24 text-white/78";
  const frontContentClass = isDocumentFront ? "text-[#2f2a23]" : "text-white";
  const frontDateClass = isDocumentFront ? "text-[#5f5346]" : "text-white/90";
  const frontTitleClass = isDocumentFront ? "text-[#231f1a]" : "text-white";
  const frontCommentClass = isDocumentFront ? "text-[#3b352d]" : "text-white/90";
  const backgroundStyle = {
    backgroundImage: `url(${backgroundImage})`,
  };
  const blurExtendImageStyle = {
    ...backgroundStyle,
    backgroundPosition: "center 35%",
  };

  return (
    <div
      className={`absolute inset-0 isolate overflow-hidden rounded-[22px] border bg-[#fffaf0] ${
        isBlurExtend ? "border-white/45" : "border-white/25"
      }`}
    >
      {isBlurExtend ? (
        <>
          <div
            className="absolute inset-0 z-0 scale-110 bg-cover blur-xl brightness-[0.82]"
            style={blurExtendImageStyle}
          />
          <div
            className="absolute inset-0 z-0 bg-contain bg-no-repeat"
            style={blurExtendImageStyle}
          />
        </>
      ) : (
        <div
          className="absolute inset-0 z-0 bg-cover bg-center"
          style={backgroundStyle}
        />
      )}
      <div
        className={`absolute inset-0 z-0 ${
          isBack ? "bg-[#fff7ec]/94" : frontOverlayClass
        }`}
      />
      {!isBack ? (
        <div className={`absolute inset-x-0 top-0 z-0 h-28 ${frontTopFadeClass}`} />
      ) : null}

      {!isBack ? (
        <>
          <p
            className={`absolute left-5 top-5 z-10 max-w-[70%] truncate rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${frontLabelClass}`}
          >
            {deckLabel}
          </p>

          <div
            className={`absolute inset-x-0 bottom-0 z-10 px-5 pb-6 pt-5 ${frontContentClass}`}
          >
            <p className={`text-xs font-medium ${frontDateClass}`}>{date}</p>
            <h3
              className={`mt-3 line-clamp-3 text-3xl font-semibold leading-tight ${frontTitleClass}`}
            >
              {frontText || "Untitled"}
            </h3>
            {frontComment ? (
              <p
                className={`mt-4 whitespace-pre-line text-sm leading-6 ${frontCommentClass}`}
              >
                {frontComment}
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
  cardId,
  defaultImageSeed,
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
    imagePath || defaultImageForCard(defaultImageSeed ?? cardId);
  const date = formatDate(cardDate);
  const isBack = previewFace === "back";

  return (
    <section className="mx-auto w-full max-w-[360px] lg:sticky lg:top-4">
      <button
        type="button"
        onClick={() => onPreviewFaceChange(isBack ? "front" : "back")}
        className="group relative block aspect-[3/4] w-full cursor-pointer overflow-hidden rounded-[22px] text-left shadow-[0_20px_54px_rgba(87,72,52,0.24)] focus:outline-none focus:ring-2 focus:ring-[#d8c8aa] focus:ring-offset-2 focus:ring-offset-[#fffaf0]"
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
        />
      </button>
    </section>
  );
}
