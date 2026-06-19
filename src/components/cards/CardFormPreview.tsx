import type {
  CardImageFitMode,
  CardImageFrameMode,
  DefaultCardImageKey,
} from "@/lib/types";

import CardFace from "./CardFace";
import { defaultImageForCard, formatDate } from "./cardUiUtils";

type Props = {
  backText: string;
  cardDate: string;
  defaultImageKey?: DefaultCardImageKey;
  frontComment: string;
  frontText: string;
  imageFitMode?: CardImageFitMode;
  imageFrameMode?: CardImageFrameMode;
  imagePath: string;
  linkUrl: string;
  onPreviewFaceChange: (face: "front" | "back") => void;
  previewFace: "front" | "back";
  selectedDeckName: string;
};

export default function CardFormPreview({
  backText,
  cardDate,
  defaultImageKey,
  frontComment,
  frontText,
  imageFrameMode = "none",
  imageFitMode = "cover",
  imagePath,
  linkUrl,
  onPreviewFaceChange,
  previewFace,
  selectedDeckName,
}: Props) {
  const previewBackground =
    imagePath || defaultImageForCard({ defaultImageKey });
  const date = formatDate(cardDate);
  const isBack = previewFace === "back";
  const previewShadowClass =
    imageFitMode === "blurExtend"
      ? "shadow-[0_22px_58px_rgba(126,107,82,0.16)]"
      : "shadow-[0_20px_54px_rgba(87,72,52,0.24)]";

  return (
    <section className="mx-auto w-full max-w-[300px] sm:max-w-[340px] lg:sticky lg:top-4 lg:max-w-[360px]">
      <button
        type="button"
        onClick={() => onPreviewFaceChange(isBack ? "front" : "back")}
        className={`group relative isolate block aspect-[3/4] w-full cursor-pointer overflow-hidden rounded-[18px] text-left ring-1 ring-[#d8c8aa]/48 transition duration-200 [perspective:1200px] focus:outline-none focus:ring-2 focus:ring-[#d8c8aa] focus:ring-offset-2 focus:ring-offset-[#fffaf0] ${previewShadowClass}`}
        aria-label={isBack ? "表面プレビューを表示" : "裏面プレビューを表示"}
      >
        <CardFace
          backgroundImage={previewBackground}
          backText={backText}
          date={date}
          deckLabel={selectedDeckName}
          face={previewFace}
          frontComment={frontComment}
          frontText={frontText}
          imageFrameMode={imageFrameMode}
          imageFitMode={imageFitMode}
          linkUrl={linkUrl}
          preserve3d={false}
          scrollableBackMemo
          size="tile"
        />
      </button>
    </section>
  );
}
