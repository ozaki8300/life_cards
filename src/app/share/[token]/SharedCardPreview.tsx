"use client";

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
  const backgroundImage =
    shareMode === "withImage" && card.imagePath
      ? card.imagePath
      : defaultImageForCard(card);

  return (
    <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
      <SharedCardFacePreview
        backgroundImage={backgroundImage}
        card={card}
        date={date}
        face="front"
        shadowClass="shadow-[0_28px_80px_rgba(87,72,52,0.26)]"
      />

      <SharedCardFacePreview
        backgroundImage={backgroundImage}
        card={card}
        date={date}
        face="back"
        shadowClass="shadow-[0_28px_80px_rgba(87,72,52,0.18)]"
      />
    </div>
  );
}
