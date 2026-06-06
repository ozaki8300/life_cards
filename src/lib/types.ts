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

  isFavorite?: boolean;

  frontText?: string;

  backText?: string;

  createdAt: string;
  updatedAt: string;
};
