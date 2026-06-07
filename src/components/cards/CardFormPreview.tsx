import { useState } from "react";

import MarkdownMemo from "@/components/MarkdownMemo";

import { defaultImageForCard, formatDate } from "./cardUiUtils";

type Props = {
  backText: string;
  cardDate: string;
  cardId: string;
  frontComment: string;
  frontText: string;
  imagePath: string;
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
};

function PreviewFace({
  backgroundImage,
  backText,
  date,
  deckLabel,
  face,
  frontComment,
  frontText,
}: PreviewFaceProps) {
  const isBack = face === "back";

  return (
    <div className="absolute inset-0 isolate overflow-hidden rounded-[22px] border border-white/25 bg-[#fffaf0]">
      <div
        className="absolute inset-0 z-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${backgroundImage})` }}
      />
      <div
        className={`absolute inset-0 z-0 ${
          isBack
            ? "bg-[#fff7ec]/94"
            : "bg-gradient-to-t from-black/60 via-black/18 to-black/5"
        }`}
      />
      {!isBack ? (
        <div className="absolute inset-x-0 top-0 z-0 h-28 bg-gradient-to-b from-black/32 to-transparent" />
      ) : null}

      {!isBack ? (
        <>
          <p className="absolute left-5 top-5 z-10 max-w-[70%] truncate rounded-full bg-black/24 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/78">
            {deckLabel}
          </p>

          <div className="absolute inset-x-0 bottom-0 z-10 px-5 pb-6 pt-5 text-white">
            <p className="text-xs font-medium text-white/90">{date}</p>
            <h3 className="mt-3 line-clamp-3 text-3xl font-semibold leading-tight text-white">
              {frontText || "Untitled"}
            </h3>
            {frontComment ? (
              <p className="mt-4 whitespace-pre-line text-sm leading-6 text-white/90">
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
        </div>
      )}
    </div>
  );
}

export default function CardFormPreview({
  backText,
  cardDate,
  cardId,
  frontComment,
  frontText,
  imagePath,
  selectedDeckName,
}: Props) {
  const [isBack, setIsBack] = useState(false);
  const previewBackground = imagePath || defaultImageForCard(cardId);
  const date = formatDate(cardDate);

  return (
    <section className="mx-auto w-full max-w-[360px] lg:sticky lg:top-4">
      <button
        type="button"
        onClick={() => setIsBack((current) => !current)}
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
        />
      </button>
    </section>
  );
}
