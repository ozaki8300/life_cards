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
  const backgroundImage = card.imagePath || defaultImageForCard(card.id);
  const isRail = layout === "rail";

  return (
    <article
      onClick={onFlip}
      data-side={isBack ? "back" : "front"}
      className={`group relative isolate aspect-[3/4] cursor-pointer overflow-hidden rounded-[18px] transition duration-200 [perspective:1000px] focus-within:ring-2 focus-within:ring-[#d8c8aa] focus-within:ring-offset-2 focus-within:ring-offset-[#fffaf0] ${
        isRail ? "" : "hover:-translate-y-1"
      } ${isRail ? "shadow-[0_10px_24px_rgba(32,24,16,0.16)]" : "shadow-[0_18px_42px_rgba(32,24,16,0.22)] hover:shadow-[0_24px_54px_rgba(32,24,16,0.28)]"}`}
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
        </div>
      </div>

      <button
        type="button"
        aria-label="Open card detail"
        onClick={(event) => {
          event.stopPropagation();
          onOpen();
        }}
        className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-black/35 text-lg font-semibold leading-none text-white shadow-sm backdrop-blur-md transition hover:bg-black/50 focus:outline-none focus:ring-2 focus:ring-white/70"
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
        className={`absolute bottom-4 right-4 z-10 flex h-9 w-9 items-center justify-center rounded-full border text-lg leading-none shadow-[0_4px_14px_rgba(87,72,52,0.14)] backdrop-blur-md transition focus:outline-none focus:ring-2 focus:ring-white/70 focus:ring-offset-2 focus:ring-offset-[#fffaf0] ${
          isFavorite
            ? "border-[#d8c8aa]/70 bg-[#fff4c7]/82 text-[#8a6410] hover:bg-[#fff0b5]"
            : "border-[#d8c8aa]/60 bg-[#fffaf0]/64 text-[#6f6253]/82 hover:bg-[#fffaf0]/82 hover:text-[#5f5346]"
        }`}
      >
        {isFavorite ? "★" : "☆"}
      </button>

    </article>
  );
}
