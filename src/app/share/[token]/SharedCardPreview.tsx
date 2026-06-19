"use client";

import { useState } from "react";

import CardFace from "@/components/cards/CardFace";
import { defaultImageForCard } from "@/components/cards/cardUiUtils";
import type { ShareCardMode, ShareCardPayload } from "@/lib/shareCardPayload";

type Props = {
  card: ShareCardPayload["card"];
  date: string;
  shareMode: ShareCardMode;
};

type SharedCardFacePreviewProps = {
  backgroundImage: string;
  card: ShareCardPayload["card"];
  date: string;
  face: "front" | "back";
  shadowClass: string;
};

const sharedPreviewBaseWidth = 460;
const sharedPreviewBaseHeight = (sharedPreviewBaseWidth * 4) / 3;

function SharedCardFacePreview({
  backgroundImage,
  card,
  date,
  face,
  shadowClass,
}: SharedCardFacePreviewProps) {
  return (
    <div
      className={`relative mx-auto aspect-[3/4] w-[min(320px,100%)] overflow-hidden rounded-[24px] sm:w-[360px] ${shadowClass}`}
    >
      <div
        className="absolute left-1/2 top-1/2 origin-center overflow-hidden rounded-[24px] [transform:translate(-50%,-50%)_scale(0.69565)] sm:[transform:translate(-50%,-50%)_scale(0.78261)]"
        style={{
          height: sharedPreviewBaseHeight,
          width: sharedPreviewBaseWidth,
        }}
      >
        <div className="relative h-full w-full">
          <CardFace
            backgroundImage={backgroundImage}
            backText={card.backText}
            date={date}
            deckLabel="Shared"
            face={face}
            frontComment={card.frontComment}
            frontText={card.frontText}
            imageFitMode={card.imageFitMode}
            imageFrameMode={card.imageFrameMode}
            linkUrl={card.linkUrl}
            preserve3d={false}
            size="detail"
          />
        </div>
      </div>
    </div>
  );
}

export default function SharedCardPreview({ card, date, shareMode }: Props) {
  const [face, setFace] = useState<"front" | "back">("front");
  const backgroundImage =
    shareMode === "withImage" && card.imagePath
      ? card.imagePath
      : defaultImageForCard(card);
  const helpText = face === "front" ? "タップで裏面を見る" : "タップで表面に戻る";

  function flipCard() {
    setFace((currentFace) => (currentFace === "front" ? "back" : "front"));
  }

  return (
    <div className="text-center">
      <div
        role="button"
        tabIndex={0}
        aria-label={helpText}
        onClick={flipCard}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            flipCard();
          }
        }}
        className="cursor-pointer touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2f2a23] focus-visible:ring-offset-4 focus-visible:ring-offset-[#f7f3ea]"
      >
        <SharedCardFacePreview
          backgroundImage={backgroundImage}
          card={card}
          date={date}
          face={face}
          shadowClass="shadow-[0_28px_80px_rgba(87,72,52,0.24)]"
        />
      </div>
      <p className="mt-3 text-xs font-semibold text-[#8d7f6e]">
        {helpText}
      </p>
    </div>
  );
}
