import type { Card } from "@/lib/types";

import CardFace from "./CardFace";
import { defaultImageForCard, formatDate } from "./cardUiUtils";

const faceBaseClass =
  "absolute inset-0 transition-opacity duration-150 [-webkit-backface-visibility:hidden] [backface-visibility:hidden] [transform-style:preserve-3d] [transform:translateZ(0)]";
const frontFaceClass = `${faceBaseClass} ${
  "visible opacity-100 group-data-[side=back]:invisible group-data-[side=back]:opacity-0 group-data-[side=back]:pointer-events-none"
}`;
const backFaceClass = `${faceBaseClass} ${
  "invisible opacity-0 pointer-events-none group-data-[side=back]:visible group-data-[side=back]:opacity-100 group-data-[side=back]:pointer-events-auto"
}`;
const faceControlBaseClass =
  "absolute flex items-center justify-center rounded-full border backdrop-blur-[2px] transition focus:outline-none focus:ring-2 focus:ring-white/70";
const faceControlLayerClass =
  "pointer-events-none absolute inset-0 z-20 [transform-style:preserve-3d]";
const frontControlTransformClass = "[transform:translateZ(1px)]";
const backControlTransformClass =
  "[-webkit-backface-visibility:hidden] [backface-visibility:hidden] [transform:rotateY(180deg)_translateZ(1px)]";
const openDetailButtonClass = `${faceControlBaseClass} right-4 top-4 h-8 w-8 border-[#d8c8aa]/45 bg-[#f5eee1]/84 text-lg font-semibold leading-none text-[#8f806d] shadow-[0_8px_22px_rgba(87,72,52,0.1)] hover:border-[#d8c8aa]/58 hover:bg-[#fffaf0]/90 hover:text-[#756750]`;
const favoriteButtonBaseClass = `${faceControlBaseClass} bottom-4 right-4 h-9 w-9 text-lg leading-none shadow-[0_8px_22px_rgba(87,72,52,0.1)] focus:ring-offset-2 focus:ring-offset-[#fffaf0]`;

export default function CardTile({
  card,
  deckLabel,
  isBack,
  isFavorite,
  layout = "grid",
  onFlip,
  onOpen,
  onToggleFavorite,
}: {
  card: Card;
  deckLabel: string;
  isBack: boolean;
  isFavorite: boolean;
  layout?: "grid" | "rail";
  onFlip: () => void;
  onOpen: () => void;
  onToggleFavorite: () => void;
}) {
  const date = formatDate(card.createdAt);
  const backgroundImage = card.imagePath || defaultImageForCard(card);
  const isRail = layout === "rail";
  const isBlurExtend = card.imageFitMode === "blurExtend";
  const cardShadowClass = isBlurExtend
    ? isRail
      ? "shadow-[0_12px_30px_rgba(126,107,82,0.14)]"
      : "shadow-[0_20px_52px_rgba(126,107,82,0.16)] hover:shadow-[0_24px_62px_rgba(126,107,82,0.2)]"
    : isRail
      ? "shadow-[0_10px_24px_rgba(32,24,16,0.16)]"
      : "shadow-[0_18px_42px_rgba(32,24,16,0.22)] hover:shadow-[0_24px_54px_rgba(32,24,16,0.28)]";
  const favoriteButtonToneClass = isFavorite
    ? "border-[#d8c8aa]/55 bg-[#fff2c8]/84 text-[#8a6f24] hover:bg-[#fff0b5]/92 hover:text-[#765d19]"
    : "border-[#d8c8aa]/45 bg-[#f5eee1]/82 text-[#8f806d] hover:border-[#d8c8aa]/58 hover:bg-[#fffaf0]/90 hover:text-[#756750]";

  function renderFaceControls(transformClass: string) {
    return (
      <div className={`${faceControlLayerClass} ${transformClass}`}>
        <button
          type="button"
          aria-label="Open card detail"
          onClick={(event) => {
            event.stopPropagation();
            onOpen();
          }}
          className={`${openDetailButtonClass} pointer-events-auto`}
        >
          ...
        </button>

        <button
          type="button"
          aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
          aria-pressed={isFavorite}
          onClick={(event) => {
            event.stopPropagation();
            onToggleFavorite();
          }}
          className={`${favoriteButtonBaseClass} ${favoriteButtonToneClass} pointer-events-auto`}
        >
          {isFavorite ? "★" : "☆"}
        </button>
      </div>
    );
  }

  return (
    <article
      onClick={onFlip}
      data-side={isBack ? "back" : "front"}
      className={`group relative isolate aspect-[3/4] cursor-pointer overflow-hidden rounded-[18px] transition duration-200 [perspective:1000px] focus-within:ring-2 focus-within:ring-[#d8c8aa] focus-within:ring-offset-2 focus-within:ring-offset-[#fffaf0] ${
        isRail ? "" : "hover:-translate-y-1"
      } ${cardShadowClass}`}
    >
      <div
        className={`absolute inset-0 rounded-[18px] transition-transform duration-500 ease-out [transform-style:preserve-3d] motion-reduce:transition-none ${
          isBack ? "[transform:rotateY(180deg)]" : ""
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
            size="tile"
          />
          {renderFaceControls(frontControlTransformClass)}
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
            size="tile"
          />
          {renderFaceControls(backControlTransformClass)}
        </div>
      </div>

    </article>
  );
}
