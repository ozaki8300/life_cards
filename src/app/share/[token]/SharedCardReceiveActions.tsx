"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import LoginButton from "@/components/auth/LoginButton";
import { CardRepository } from "@/lib/cardRepository";
import type { ShareCardMode, ShareCardPayload } from "@/lib/shareCardPayload";
import type { Card } from "@/lib/types";

type Props = {
  card: ShareCardPayload["card"];
  shareMode: ShareCardMode;
};

function generateReceivedCardId() {
  if (globalThis.crypto?.randomUUID) {
    return `card_${globalThis.crypto.randomUUID()}`;
  }

  return `card_${Date.now()}`;
}

function createTextOnlyCard(card: ShareCardPayload["card"]): Card {
  const now = new Date().toISOString();

  return {
    backText: card.backText ?? "",
    createdAt: now,
    deckId: "uncategorized",
    defaultImageKey: card.defaultImageKey ?? "paper",
    frontComment: card.frontComment ?? "",
    frontText: card.frontText ?? "",
    id: generateReceivedCardId(),
    imageFitMode: card.imageFitMode ?? "cover",
    imageFrameMode: card.imageFrameMode ?? "none",
    imagePath: "",
    isFavorite: false,
    linkUrl: card.linkUrl?.trim() || undefined,
    updatedAt: now,
  };
}

export default function SharedCardReceiveActions({ card, shareMode }: Props) {
  const router = useRouter();
  const [statusMessage, setStatusMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  function saveTextOnlyCard() {
    setStatusMessage("");
    setIsSaving(true);

    try {
      CardRepository.saveCard(createTextOnlyCard(card), []);
      router.push("/cards");
    } catch (error) {
      console.warn("Life Cards shared text-only receive failed", error);
      setStatusMessage("カードを受け取れませんでした");
      setIsSaving(false);
    }
  }

  return (
    <section className="mx-auto w-full max-w-xl rounded-[18px] border border-[#e8ddcb] bg-[#fffaf0]/82 p-4 text-center shadow-[0_18px_54px_rgba(87,72,52,0.13)]">
      <h2 className="text-base font-bold text-[#332d25]">
        {shareMode === "withImage"
          ? "どう受け取りますか？"
          : "このカードを受け取りますか？"}
      </h2>

      {shareMode === "withImage" ? (
        <p className="mt-3 text-sm leading-6 text-[#6f6253]">
          画像はこの画面で見られます。
          <br />
          保存されるのは文字だけです。
        </p>
      ) : null}

      <button
        type="button"
        onClick={saveTextOnlyCard}
        disabled={isSaving}
        className="mt-4 w-full rounded-full bg-[#2f2a23] px-5 py-3 text-sm font-semibold text-[#fffaf0] transition hover:bg-[#4a4034] focus:outline-none focus:ring-2 focus:ring-[#2f2a23] focus:ring-offset-2 focus:ring-offset-[#fffaf0] disabled:cursor-not-allowed disabled:bg-[#8d7f6e]"
      >
        {isSaving ? "受け取り中..." : "文字だけ受け取る"}
      </button>

      {shareMode === "withImage" ? (
        <div className="mt-4 grid gap-2">
          <p className="text-xs font-semibold leading-5 text-[#6f6253]">
            画像も受け取りたい場合はログインしてください
          </p>
          <div className="flex justify-center">
            <LoginButton />
          </div>
        </div>
      ) : null}

      {statusMessage ? (
        <p className="mt-3 text-xs font-semibold text-[#a24d3c]">
          {statusMessage}
        </p>
      ) : null}
    </section>
  );
}
