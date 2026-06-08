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

  imagePath?: string;

  imageFitMode?: CardImageFitMode;

  linkUrl?: string;

  isFavorite?: boolean;

  frontText?: string;

  frontComment?: string;

  backText?: string;

  createdAt: string;
  updatedAt: string;
};

export type CardImageFitMode = "cover" | "blurExtend";
