export type Deck = {
  id: string;
  name: string;
  coverImage?: string;
  isShared: boolean;
  createdAt: string;
};

export type Card = {
  id: string;

  deckId: string;

  imagePath?: string;

  frontText?: string;

  backText?: string;

  createdAt: string;
  updatedAt: string;
};
