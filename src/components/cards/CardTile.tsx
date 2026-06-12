import type { MouseEvent } from "react";

import type { Card } from "@/lib/types";

import CardFace from "./CardFace";
import { defaultImageForCard, formatDate } from "./cardUiUtils";

const faceBaseClass =
  "absolute inset-0 [-webkit-backface-visibility:hidden] [backface-visibility:hidden]";
const frontFaceClass = `${faceBaseClass} [transform:rotateY(0deg)]`;
const backFaceClass = `${faceBaseClass} [transform:rotateY(180deg)]`;
export default function CardTile({
  card,
  deckLabel,
  isBack,
  layout = "grid",
  onFlip,
}: {
  card: Card;
  deckLabel: string;
  isBack: boolean;
  layout?: "grid" | "rail";
  onFlip: () => void;
}) {
  const date = formatDate(card.createdAt);
  const backgroundImage = card.imagePath || defaultImageForCard(card);
  const isRail = layout === "rail";
  const isBlurExtend = card.imageFitMode === "blurExtend";
  const cardShadowClass = isBlurExtend
    ? isRail
      ? "shadow-[0_8px_22px_rgba(122,105,82,0.14),0_1px_4px_rgba(87,72,52,0.06)]"
      : "shadow-[0_14px_34px_rgba(122,105,82,0.18),0_2px_8px_rgba(87,72,52,0.08)] hover:shadow-[0_18px_42px_rgba(122,105,82,0.21),0_3px_10px_rgba(87,72,52,0.09)]"
    : isRail
      ? "shadow-[0_8px_22px_rgba(122,105,82,0.15),0_1px_4px_rgba(87,72,52,0.07)]"
      : "shadow-[0_14px_34px_rgba(122,105,82,0.19),0_2px_8px_rgba(87,72,52,0.09)] hover:shadow-[0_18px_42px_rgba(122,105,82,0.22),0_3px_10px_rgba(87,72,52,0.1)]";
  function handleCardClick(event: MouseEvent<HTMLElement>) {
    const target = event.target;

    if (
      target instanceof Element &&
      target.closest("[data-card-action='true']")
    ) {
      return;
    }

    onFlip();
  }

  return (
    <article
      onClick={handleCardClick}
      data-side={isBack ? "back" : "front"}
      className={`group relative isolate aspect-[3/4] cursor-pointer overflow-hidden rounded-[18px] ring-1 ring-[#d8c8aa]/48 transition duration-200 [perspective:1200px] focus-within:ring-2 focus-within:ring-[#d8c8aa] focus-within:ring-offset-2 focus-within:ring-offset-[#fffaf0] ${
        isRail ? "" : "hover:-translate-y-1"
      } ${cardShadowClass}`}
    >
      <div
        className={`pointer-events-none absolute inset-0 rounded-[18px] [transform-style:preserve-3d] transition-transform duration-500 ease-out ${
          isBack ? "[transform:rotateY(180deg)]" : "[transform:rotateY(0deg)]"
        }`}
      >
        <div className={frontFaceClass}>
          <CardFace
            backgroundImage={backgroundImage}
            backText={card.backText}
            date={date}
            deckLabel={deckLabel}
            face="front"
            frontComment={card.frontComment}
            frontText={card.frontText}
            imageFitMode={card.imageFitMode}
            linkUrl={card.linkUrl}
            preserve3d={false}
            size="tile"
          />
        </div>
        <div className={backFaceClass}>
          <CardFace
            backgroundImage={backgroundImage}
            backText={card.backText}
            date={date}
            deckLabel={deckLabel}
            face="back"
            frontComment={card.frontComment}
            frontText={card.frontText}
            imageFitMode={card.imageFitMode}
            linkUrl={card.linkUrl}
            preserve3d={false}
            size="tile"
          />
        </div>
      </div>
    </article>
  );
}
