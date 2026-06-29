import MarkdownMemo from "@/components/MarkdownMemo";
import type { Card } from "@/lib/types";

import { createRecallStageText } from "./recallStage";

type Props = {
  backgroundImage: string;
  card: Card;
  date: string;
  deckLabel: string;
  isBackMemoOpen: boolean;
  onBackMemoOpen: () => void;
};

export default function RecallStage({
  backgroundImage,
  card,
  date,
  deckLabel,
  isBackMemoOpen,
  onBackMemoOpen,
}: Props) {
  const stageText = createRecallStageText(card);
  const frontText = card.frontText?.trim() ?? "";
  const frontComment = card.frontComment?.trim() ?? "";
  const backText = card.backText?.trim() ?? "";
  const hasBackMemo = Boolean(backText);

  return (
    <section className="relative mx-auto flex min-h-full w-full max-w-6xl flex-col justify-center gap-7 overflow-x-hidden px-4 py-[calc(env(safe-area-inset-top)+5rem)] text-[#f9efe0] sm:px-8 sm:py-[calc(env(safe-area-inset-top)+5.75rem)] lg:grid lg:grid-cols-[minmax(18rem,0.86fr)_minmax(20rem,1fr)] lg:items-center lg:gap-12">
      <style>
        {`
          @keyframes recallMemoIn {
            from {
              opacity: 0;
              transform: translateY(12px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}
      </style>
      <div className="relative mx-auto aspect-[3/4] w-full max-w-[min(76vw,21rem)] overflow-hidden rounded-[24px] border border-[#f6dfbb]/26 bg-[#211711] shadow-[0_34px_96px_rgba(0,0,0,0.48)] sm:max-w-sm lg:max-w-md">
        <div
          aria-hidden="true"
          className="absolute inset-0 scale-110 bg-cover bg-center opacity-42 blur-2xl"
          style={{ backgroundImage: `url(${backgroundImage})` }}
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          alt=""
          aria-hidden="true"
          className="relative z-10 h-full w-full object-contain"
          src={backgroundImage}
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 z-20 bg-gradient-to-t from-[#150f0b]/76 via-transparent to-[#150f0b]/18"
        />
        <div className="absolute inset-x-0 bottom-0 z-30 px-5 pb-5 text-white">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/66">
            {deckLabel}
          </p>
          {frontText ? (
            <h2 className="mt-2 line-clamp-3 text-2xl font-semibold leading-tight drop-shadow-[0_2px_12px_rgba(0,0,0,0.78)]">
              {frontText}
            </h2>
          ) : null}
          <p className="mt-3 text-xs font-medium text-white/72">{date}</p>
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-2xl flex-col">
        <div className="space-y-2 border-l border-[#f3d9ad]/32 pl-4 sm:pl-5">
          {stageText.map((line) => (
            <p
              key={line}
              className="text-base font-medium leading-8 text-[#f8e7cf] sm:text-lg sm:leading-9"
            >
              {line}
            </p>
          ))}
        </div>

        {frontText ? (
          <h1 className="mt-7 text-3xl font-semibold leading-tight text-white sm:text-5xl">
            {frontText}
          </h1>
        ) : null}

        {frontComment ? (
          <p className="mt-5 whitespace-pre-line text-base leading-8 text-[#f4dfc4]/86 sm:text-lg sm:leading-9">
            {frontComment}
          </p>
        ) : null}

        <div className="mt-9">
          <button
            type="button"
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-[#f3d9ad]/30 bg-[#fff6e8]/9 px-5 text-sm font-semibold text-[#f8e7cf] shadow-[0_14px_36px_rgba(0,0,0,0.16)] backdrop-blur transition hover:bg-[#fff6e8]/15 focus:outline-none focus:ring-2 focus:ring-[#f3d9ad]/70"
            onClick={onBackMemoOpen}
          >
            {isBackMemoOpen ? "カードに戻る" : "あの日の続きを読む"}
          </button>
        </div>

        {isBackMemoOpen ? (
          <div
            className="relative mt-6 overflow-hidden rounded-[18px] border border-[#f3d9ad]/16 bg-[#4b3124]/38 shadow-[0_24px_62px_rgba(0,0,0,0.3)] backdrop-blur-md"
            style={{ animation: "recallMemoIn 420ms cubic-bezier(0.22, 1, 0.36, 1)" }}
          >
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,232,194,0.12),rgba(85,51,30,0.18)),linear-gradient(90deg,rgba(255,255,255,0.04),transparent_34%,rgba(0,0,0,0.08))]"
            />
            <div className="card-detail-back-scroll relative h-[38vh] max-h-[29rem] min-h-[16rem] overflow-y-auto overscroll-contain px-4 py-5 pr-5 [mask-image:linear-gradient(to_bottom,black_0,black_calc(100%-56px),transparent_100%)] [-webkit-mask-image:linear-gradient(to_bottom,black_0,black_calc(100%-56px),transparent_100%)] sm:h-[40vh] sm:min-h-[18rem] sm:px-6 sm:py-6 sm:pr-7 lg:h-[42vh]">
              <div className="[&_blockquote]:!border-[#e8c592]/34 [&_blockquote]:!bg-[#2a1a11]/24 [&_blockquote]:!text-[#f2d8b7] [&_code]:!border-[#e8c592]/24 [&_code]:!bg-[#2a1a11]/42 [&_code]:!text-[#ffe8c7] [&_h1]:!mb-3 [&_h1]:!mt-5 [&_h1]:!text-[1.18rem] [&_h1]:!font-medium [&_h1]:!leading-snug [&_h1]:!text-[#fff2dd]/90 [&_h2]:!mb-2.5 [&_h2]:!mt-5 [&_h2]:!border-[#e8c592]/14 [&_h2]:!pb-1 [&_h2]:!text-[1.05rem] [&_h2]:!font-medium [&_h2]:!leading-snug [&_h2]:!text-[#fff2dd]/88 [&_h3]:!mb-2 [&_h3]:!mt-4 [&_h3]:!text-[0.98rem] [&_h3]:!font-medium [&_h3]:!leading-snug [&_h3]:!text-[#fff2dd]/84 [&_li]:!text-[#f4dfc4] [&_mark]:!bg-[#f3d9ad]/24 [&_mark]:!text-[#fff5e6] [&_ol]:!text-[#f4dfc4] [&_p]:!text-[#f4dfc4] [&_pre]:!border-[#e8c592]/22 [&_pre]:!bg-[#21140d]/74 [&_strong]:!text-[#fff5e6] [&_table]:!text-[#f4dfc4] [&_td]:!border-[#e8c592]/18 [&_th]:!border-[#e8c592]/22 [&_thead]:!bg-[#2a1a11]/44 [&_thead]:!text-[#fff2dd] [&_ul]:!text-[#f4dfc4]">
                <MarkdownMemo
                  emptyText="裏面メモがありません"
                  readingDensity="detailBack"
                >
                  {backText}
                </MarkdownMemo>
              </div>
              <div aria-hidden="true" className="h-7" />
            </div>
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#332018]/98 via-[#332018]/62 to-transparent"
            />
          </div>
        ) : hasBackMemo ? (
          <p className="mt-3 text-sm font-medium text-[#d9c09b]/74">
            続きがあります。
          </p>
        ) : null}
      </div>
    </section>
  );
}
