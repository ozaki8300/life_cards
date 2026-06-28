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
    <section className="relative mx-auto flex min-h-full w-full max-w-6xl flex-col justify-center gap-5 overflow-x-hidden px-4 py-[calc(env(safe-area-inset-top)+4.5rem)] text-[#f9efe0] sm:px-8 lg:grid lg:grid-cols-[minmax(18rem,0.86fr)_minmax(20rem,1fr)] lg:items-center lg:gap-10">
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
      <div className="relative mx-auto aspect-[3/4] w-full max-w-[min(78vw,22rem)] overflow-hidden rounded-[24px] border border-[#f6dfbb]/26 bg-[#211711] shadow-[0_32px_90px_rgba(0,0,0,0.46)] sm:max-w-sm lg:max-w-md">
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

        <div className="mt-8">
          <button
            type="button"
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-[#f3d9ad]/34 bg-[#fff6e8]/10 px-5 text-sm font-semibold text-[#f8e7cf] shadow-[0_14px_36px_rgba(0,0,0,0.18)] backdrop-blur transition hover:bg-[#fff6e8]/16 focus:outline-none focus:ring-2 focus:ring-[#f3d9ad]/70"
            onClick={onBackMemoOpen}
          >
            {isBackMemoOpen ? "カードに戻る" : "あの日の続きを読む"}
          </button>
        </div>

        {isBackMemoOpen ? (
          <div
            className="relative mt-5 overflow-hidden rounded-[18px] border border-[#f3d9ad]/18 bg-[#5a3925]/42 shadow-[0_22px_54px_rgba(0,0,0,0.28)] backdrop-blur-md"
            style={{ animation: "recallMemoIn 420ms cubic-bezier(0.22, 1, 0.36, 1)" }}
          >
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,232,194,0.12),rgba(85,51,30,0.18)),linear-gradient(90deg,rgba(255,255,255,0.04),transparent_34%,rgba(0,0,0,0.08))]"
            />
            <div className="card-detail-back-scroll relative max-h-[min(28vh,15rem)] overflow-y-auto overscroll-contain px-4 py-4 pr-5 [mask-image:linear-gradient(to_bottom,black_0,black_calc(100%-44px),transparent_100%)] [-webkit-mask-image:linear-gradient(to_bottom,black_0,black_calc(100%-44px),transparent_100%)] sm:max-h-[min(32vh,17rem)] sm:px-6 sm:py-5 sm:pr-7">
              <div className="[&_blockquote]:!border-[#e8c592]/38 [&_blockquote]:!bg-[#2a1a11]/28 [&_blockquote]:!text-[#f2d8b7] [&_code]:!border-[#e8c592]/24 [&_code]:!bg-[#2a1a11]/42 [&_code]:!text-[#ffe8c7] [&_h1]:!text-[#fff2dd] [&_h2]:!border-[#e8c592]/22 [&_h2]:!text-[#fff2dd] [&_h3]:!text-[#fff2dd] [&_li]:!text-[#f4dfc4] [&_mark]:!bg-[#f3d9ad]/26 [&_mark]:!text-[#fff5e6] [&_ol]:!text-[#f4dfc4] [&_p]:!text-[#f4dfc4] [&_pre]:!border-[#e8c592]/22 [&_pre]:!bg-[#21140d]/74 [&_strong]:!text-[#fff5e6] [&_table]:!text-[#f4dfc4] [&_td]:!border-[#e8c592]/18 [&_th]:!border-[#e8c592]/22 [&_thead]:!bg-[#2a1a11]/44 [&_thead]:!text-[#fff2dd] [&_ul]:!text-[#f4dfc4]">
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
              className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#3a2418]/96 via-[#3a2418]/58 to-transparent"
            />
          </div>
        ) : hasBackMemo ? (
          <p className="mt-3 text-sm font-medium text-[#d9c09b]/74">
            裏面メモがあります。
          </p>
        ) : null}
      </div>
    </section>
  );
}
