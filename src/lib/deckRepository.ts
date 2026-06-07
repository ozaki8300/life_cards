import { decks as seedDecks } from "@/data/decks/decks";
import type { Deck } from "@/lib/types";

import { STORAGE_KEYS } from "./storageKeys";

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readStoredDecks() {
  if (!canUseStorage()) {
    return null;
  }

  const storedValue = window.localStorage.getItem(STORAGE_KEYS.decks);

  if (!storedValue) {
    return null;
  }

  try {
    const parsedValue = JSON.parse(storedValue);

    return Array.isArray(parsedValue) ? (parsedValue as Deck[]) : null;
  } catch (error) {
    console.warn("Life Cards decks storage parse failed", error);
    return null;
  }
}

function writeStoredDecks(decks: Deck[]) {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(STORAGE_KEYS.decks, JSON.stringify(decks));
}

export const DeckRepository = {
  getDecks(seed: Deck[] = seedDecks) {
    return readStoredDecks() ?? seed;
  },

  saveDeck(deck: Deck) {
    const decks = DeckRepository.getDecks();
    const nextDecks = decks.some((item) => item.id === deck.id)
      ? decks.map((item) => (item.id === deck.id ? deck : item))
      : [...decks, deck];

    writeStoredDecks(nextDecks);
    return nextDecks;
  },

  deleteDeck(deckId: string) {
    const decks = DeckRepository.getDecks();
    const nextDecks = decks.filter((deck) => deck.id !== deckId);

    writeStoredDecks(nextDecks);
    return nextDecks;
  },

  reorderDecks(nextDecks: Deck[]) {
    writeStoredDecks(nextDecks);
    return nextDecks;
  },
};
