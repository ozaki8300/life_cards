export type Deck = {
  id: string;
  name: string;
  cardCount?: number;
  coverImage?: string;
  isShared: boolean;
  createdAt: string;
};

export type Card = {
  id: string;

  deckId: string;

  defaultImageKey?: DefaultCardImageKey;

  imagePath?: string;

  imageStoragePath?: string;

  imageFitMode?: CardImageFitMode;

  imageFrameMode?: CardImageFrameMode;

  linkUrl?: string;

  isFavorite?: boolean;

  frontText?: string;

  frontComment?: string;

  backText?: string;

  createdAt: string;
  updatedAt: string;
};

export type CardImageFrameMode = "none" | "paper";
export type CardImageFitMode = "cover" | "blurExtend";
export type DefaultCardImageKey =
  | "paper"
  | "night"
  | "sea"
  | "mountain"
  | "library";
