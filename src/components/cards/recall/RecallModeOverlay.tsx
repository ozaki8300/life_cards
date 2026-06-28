"use client";

import { useEffect, useState } from "react";

import type { Card } from "@/lib/types";
import { useEscapeKey } from "@/lib/useEscapeKey";

import RecallStage from "./RecallStage";

type Props = {
  backgroundImage: string;
  card: Card;
  date: string;
  deckLabel: string;
  onClose: () => void;
};

export default function RecallModeOverlay({
  backgroundImage,
  card,
  date,
  deckLabel,
  onClose,
}: Props) {
  const [isBackMemoOpen, setIsBackMemoOpen] = useState(false);

  useEscapeKey(onClose);

  useEffect(() => {
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, []);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Recall Mode"
      className="fixed inset-0 z-[100] overflow-x-hidden overflow-y-auto bg-[#140e0a] text-[#f9efe0]"
      onClick={onClose}
    >
      <div
        aria-hidden="true"
        className="fixed inset-0 bg-[linear-gradient(180deg,rgba(54,34,21,0.92)_0%,rgba(28,18,12,0.97)_46%,rgba(12,9,7,1)_100%),linear-gradient(118deg,rgba(117,73,38,0.28)_0%,rgba(38,24,15,0.18)_42%,rgba(167,111,62,0.12)_100%)]"
      />
      <div
        aria-hidden="true"
        className="fixed inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.42)_100%)]"
      />
      <div
        aria-hidden="true"
        className="fixed inset-0 opacity-[0.035] mix-blend-soft-light [background-image:linear-gradient(rgba(255,245,226,0.8)_1px,transparent_1px),linear-gradient(90deg,rgba(255,245,226,0.8)_1px,transparent_1px)] [background-size:56px_56px]"
      />
      <div
        aria-hidden="true"
        className="fixed inset-0 opacity-[0.08] [background-image:repeating-linear-gradient(0deg,rgba(255,238,210,0.22)_0,rgba(255,238,210,0.22)_1px,transparent_1px,transparent_5px)]"
      />
      <button
        type="button"
        aria-label="Recall Mode を閉じる"
        className="fixed right-4 top-[calc(env(safe-area-inset-top)+1rem)] z-[120] flex h-12 w-12 items-center justify-center rounded-full border border-[#f4dfc4]/26 bg-black/28 text-3xl font-light leading-none text-[#fff6e8] shadow-[0_16px_42px_rgba(0,0,0,0.3)] backdrop-blur-md transition hover:bg-black/42 focus:outline-none focus:ring-2 focus:ring-[#f3d9ad]/74 sm:right-6"
        onClick={(event) => {
          event.stopPropagation();
          onClose();
        }}
      >
        ×
      </button>

      <div
        className="relative z-10 min-h-full"
        onClick={(event) => event.stopPropagation()}
      >
        <RecallStage
          backgroundImage={backgroundImage}
          card={card}
          date={date}
          deckLabel={deckLabel}
          isBackMemoOpen={isBackMemoOpen}
          onBackMemoOpen={() => setIsBackMemoOpen((current) => !current)}
        />
      </div>
    </div>
  );
}
