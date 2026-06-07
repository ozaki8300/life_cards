import { cards as seedCards } from "@/data/cards/cards";
import type { Card } from "@/lib/types";

import { STORAGE_KEYS } from "./storageKeys";

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readStoredCards() {
  if (!canUseStorage()) {
    return null;
  }

  const storedValue = window.localStorage.getItem(STORAGE_KEYS.cards);

  if (!storedValue) {
    return null;
  }

  try {
    const parsedValue = JSON.parse(storedValue);

    return Array.isArray(parsedValue) ? (parsedValue as Card[]) : null;
  } catch (error) {
    console.warn("Life Cards cards storage parse failed", error);
    return null;
  }
}

function writeStoredCards(cards: Card[]) {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(STORAGE_KEYS.cards, JSON.stringify(cards));
}

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

export const CardRepository = {
  getCards(seed: Card[] = seedCards) {
    return readStoredCards() ?? seed;
  },

  saveCard(card: Card) {
    const cards = CardRepository.getCards();
    const nextCards = cards.some((item) => item.id === card.id)
      ? cards.map((item) => (item.id === card.id ? card : item))
      : [...cards, card];

    writeStoredCards(nextCards);
    return nextCards;
  },

  updateCard(card: Card) {
    const cards = CardRepository.getCards();
    const nextCards = cards.map((item) => (item.id === card.id ? card : item));

    writeStoredCards(nextCards);
    return nextCards;
  },

  deleteCard(cardId: string) {
    const cards = CardRepository.getCards();
    const nextCards = cards.filter((card) => card.id !== cardId);

    writeStoredCards(nextCards);
    return nextCards;
  },

  moveCardsToDeck(fromDeckId: string, toDeckId: string) {
    const cards = CardRepository.getCards();
    const today = todayInputValue();
    const nextCards = cards.map((card) =>
      card.deckId === fromDeckId
        ? {
            ...card,
            deckId: toDeckId,
            updatedAt: today,
          }
        : card,
    );

    writeStoredCards(nextCards);
    return nextCards;
  },
};
