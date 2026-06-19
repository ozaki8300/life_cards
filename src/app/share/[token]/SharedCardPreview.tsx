"use client";

import { useRef, useState, type PointerEvent } from "react";

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
  isBack: boolean;
  shadowClass: string;
};

const sharedPreviewBaseWidth = 460;
const sharedPreviewBaseHeight = (sharedPreviewBaseWidth * 4) / 3;

function SharedCardFacePreview({
  backgroundImage,
  card,
  date,
  isBack,
  shadowClass,
}: SharedCardFacePreviewProps) {
  const flipStageClass = `relative h-full w-full [-webkit-transform-style:preserve-3d] [transform-style:preserve-3d] transition-transform duration-[520ms] ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform motion-reduce:transition-none ${
    isBack ? "[transform:rotateY(180deg)]" : "[transform:rotateY(0deg)]"
  }`;
  const faceClass =
    "absolute inset-0 [-webkit-backface-visibility:hidden] [backface-visibility:hidden]";

  return (
    <div
      className={`relative mx-auto aspect-[3/4] w-[min(320px,100%)] rounded-[24px] [perspective:1400px] sm:w-[360px] ${shadowClass}`}
    >
      <div
        className="absolute left-1/2 top-1/2 origin-center rounded-[24px] [transform:translate(-50%,-50%)_scale(0.69565)] sm:[transform:translate(-50%,-50%)_scale(0.78261)]"
        style={{
          height: sharedPreviewBaseHeight,
          width: sharedPreviewBaseWidth,
        }}
      >
        <div className={flipStageClass}>
          <div className={faceClass}>
            <CardFace
              backgroundImage={backgroundImage}
              backText={card.backText}
              date={date}
              deckLabel="Shared"
              face="front"
              frontComment={card.frontComment}
              frontText={card.frontText}
              imageFitMode={card.imageFitMode}
              imageFrameMode={card.imageFrameMode}
              linkUrl={card.linkUrl}
              preserve3d={false}
              size="detail"
            />
          </div>
          <div
            className={`${faceClass} text-left [transform:rotateY(180deg)] [&_h2]:mt-8 [&_h2]:pt-1 [&_li]:text-left [&_ol]:text-left [&_p]:text-left [&_ul]:text-left`}
          >
            <CardFace
              backgroundImage={backgroundImage}
              backText={card.backText}
              date={date}
              deckLabel="Shared"
              face="back"
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
    </div>
  );
}

export default function SharedCardPreview({ card, date, shareMode }: Props) {
  const [face, setFace] = useState<"front" | "back">("front");
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);
  const backgroundImage =
    shareMode === "withImage" && card.imagePath
      ? card.imagePath
      : defaultImageForCard(card);
  const helpText = face === "front" ? "タップで裏面を見る" : "タップで表面に戻る";

  function flipCard() {
    setFace((currentFace) => (currentFace === "front" ? "back" : "front"));
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    pointerStartRef.current = {
      x: event.clientX,
      y: event.clientY,
    };
  }

  function handlePointerUp(event: PointerEvent<HTMLDivElement>) {
    const pointerStart = pointerStartRef.current;
    pointerStartRef.current = null;

    if (!pointerStart) {
      return;
    }

    const movedX = Math.abs(event.clientX - pointerStart.x);
    const movedY = Math.abs(event.clientY - pointerStart.y);

    if (movedX > 8 || movedY > 8) {
      return;
    }

    flipCard();
  }

  return (
    <div className="text-center">
      <div
        role="button"
        tabIndex={0}
        aria-label={helpText}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
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
          isBack={face === "back"}
          shadowClass="shadow-[0_28px_80px_rgba(87,72,52,0.24)]"
        />
      </div>
      <p className="mt-3 text-xs font-semibold text-[#8d7f6e]">
        {helpText}
      </p>
    </div>
  );
}
