import { useState } from "react";

import CardFace from "./CardFace";
import { defaultImageForCard, formatDate } from "./cardUiUtils";

type Props = {
  backText: string;
  cardDate: string;
  cardId: string;
  frontComment: string;
  frontText: string;
  imagePath: string;
  selectedDeckName: string;
};

export default function CardFormPreview({
  backText,
  cardDate,
  cardId,
  frontComment,
  frontText,
  imagePath,
  selectedDeckName,
}: Props) {
  const [isBack, setIsBack] = useState(false);
  const previewBackground = imagePath || defaultImageForCard(cardId);
  const date = formatDate(cardDate);

  return (
    <section className="mx-auto w-full max-w-[360px] lg:sticky lg:top-4">
      <button
        type="button"
        onClick={() => setIsBack((current) => !current)}
        className="group relative block aspect-[3/4] w-full cursor-pointer overflow-hidden rounded-[22px] text-left shadow-[0_20px_54px_rgba(87,72,52,0.24)] [perspective:1000px] focus:outline-none focus:ring-2 focus:ring-[#d8c8aa] focus:ring-offset-2 focus:ring-offset-[#fffaf0]"
        aria-label={isBack ? "表面プレビューを表示" : "裏面プレビューを表示"}
      >
        <div
          className={`absolute inset-0 rounded-[22px] transition-transform duration-500 ease-out [transform-style:preserve-3d] motion-reduce:transition-none ${
            isBack ? "[transform:rotateY(180deg)]" : ""
          }`}
        >
          <CardFace
            backgroundImage={previewBackground}
            backText={backText}
            date={date}
            deckLabel={selectedDeckName}
            face="front"
            frontComment={frontComment}
            frontText={frontText}
            size="preview"
          />
          <CardFace
            backgroundImage={previewBackground}
            backText={backText}
            date={date}
            deckLabel={selectedDeckName}
            face="back"
            frontComment={frontComment}
            frontText={frontText}
            size="preview"
          />
        </div>
      </button>
    </section>
  );
}
