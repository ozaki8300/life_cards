import type {
  Card,
  CardImageFitMode,
  CardImageFrameMode,
  DefaultCardImageKey,
} from "./types";

export type ShareCardType = "card" | "people";
export type ShareCardMode = "withImage" | "textOnly";

export type ShareCardPayload = {
  schemaVersion: 1;
  shareMode: ShareCardMode;
  card: {
    frontText?: string;
    frontComment?: string;
    backText?: string;
    defaultImageKey?: DefaultCardImageKey;
    linkUrl?: string;
    imagePath?: string;
    imageFitMode: CardImageFitMode;
    imageFrameMode?: CardImageFrameMode;
    createdAt: string;
    updatedAt: string;
  };
  creator: {
    label: string;
  };
};

export function createShareCardPayload(
  card: Card,
  creatorLabel: string,
  shareMode: ShareCardMode = "withImage",
): ShareCardPayload {
  return {
    schemaVersion: 1,
    shareMode,
    card: {
      frontText: card.frontText,
      frontComment: card.frontComment,
      backText: card.backText,
      defaultImageKey: card.defaultImageKey ?? "paper",
      linkUrl: card.linkUrl,
      imagePath: shareMode === "withImage" ? card.imagePath : "",
      imageFitMode: card.imageFitMode ?? "cover",
      imageFrameMode: card.imageFrameMode ?? "none",
      createdAt: card.createdAt,
      updatedAt: card.updatedAt,
    },
    creator: {
      label: creatorLabel,
    },
  };
}
