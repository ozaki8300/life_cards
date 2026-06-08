"use client";

import CardFace from "@/components/cards/CardFace";
import { defaultImageForCard } from "@/components/cards/cardUiUtils";
import type { ShareCardPayload } from "@/lib/shareCardPayload";

type Props = {
  card: ShareCardPayload["card"];
  date: string;
};

export default function SharedCardPreview({ card, date }: Props) {
  const backgroundImage = card.imagePath || defaultImageForCard();

  return (
    <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
      <div className="mx-auto aspect-[3/4] w-full max-w-[360px] overflow-hidden rounded-[24px] shadow-[0_28px_80px_rgba(87,72,52,0.26)]">
        <div className="relative h-full w-full">
          <CardFace
            backgroundImage={backgroundImage}
            backText={card.backText}
            date={date}
            deckLabel="Shared"
            face="front"
            frontComment={card.frontComment}
            frontText={card.frontText}
            imageFitMode={card.imageFitMode}
            linkUrl={card.linkUrl}
            preserve3d={false}
            size="detail"
          />
        </div>
      </div>

      <div className="mx-auto aspect-[3/4] w-full max-w-[360px] overflow-hidden rounded-[24px] shadow-[0_28px_80px_rgba(87,72,52,0.18)]">
        <div className="relative h-full w-full">
          <CardFace
            backgroundImage={backgroundImage}
            backText={card.backText}
            date={date}
            deckLabel="Shared"
            face="back"
            frontComment={card.frontComment}
            frontText={card.frontText}
            imageFitMode={card.imageFitMode}
            linkUrl={card.linkUrl}
            preserve3d={false}
            size="detail"
          />
        </div>
      </div>
    </div>
  );
}
