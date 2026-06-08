import type { Card, CardImageFitMode } from "./types";

export type ShareCardType = "card" | "people";

export type ShareCardPayload = {
  schemaVersion: 1;
  card: {
    frontText?: string;
    frontComment?: string;
    backText?: string;
    linkUrl?: string;
    imagePath?: string;
    imageFitMode: CardImageFitMode;
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
): ShareCardPayload {
  return {
    schemaVersion: 1,
    card: {
      frontText: card.frontText,
      frontComment: card.frontComment,
      backText: card.backText,
      linkUrl: card.linkUrl,
      imagePath: card.imagePath,
      imageFitMode: card.imageFitMode ?? "cover",
      createdAt: card.createdAt,
      updatedAt: card.updatedAt,
    },
    creator: {
      label: creatorLabel,
    },
  };
}
