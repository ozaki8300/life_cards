"use client";

import { decks as seedDecks } from "@/data/decks/decks";
import { DeckSupabaseRepository } from "@/lib/supabase/deckSupabaseRepository";
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

function localOrSeedDecks(seed: Deck[]) {
  const localDecks = readStoredDecks();

  return localDecks && localDecks.length > 0 ? localDecks : seed;
}

export const DeckRepository = {
  getDecks(seed: Deck[] = seedDecks) {
    return localOrSeedDecks(seed);
  },

  async getDecksForCurrentUser(seed: Deck[] = seedDecks) {
    try {
      return (
        (await DeckSupabaseRepository.seedDecksIfEmpty()) ??
        DeckRepository.getDecks(seed)
      );
    } catch (error) {
      console.warn("Life Cards Supabase decks fetch failed", error);
      return DeckRepository.getDecks(seed);
    }
  },

  saveDeck(deck: Deck) {
    const decks = DeckRepository.getDecks();
    const nextDecks = decks.some((item) => item.id === deck.id)
      ? decks.map((item) => (item.id === deck.id ? deck : item))
      : [...decks, deck];

    writeStoredDecks(nextDecks);
    return nextDecks;
  },

  async saveDeckForCurrentUser(deck: Deck) {
    try {
      return (
        (await DeckSupabaseRepository.saveDeck(deck)) ??
        DeckRepository.saveDeck(deck)
      );
    } catch (error) {
      console.warn("Life Cards Supabase deck save failed", error);
      return DeckRepository.saveDeck(deck);
    }
  },

  deleteDeck(deckId: string) {
    const decks = DeckRepository.getDecks();
    const nextDecks = decks.filter((deck) => deck.id !== deckId);

    writeStoredDecks(nextDecks);
    return nextDecks;
  },

  async deleteDeckForCurrentUser(deckId: string) {
    try {
      return (
        (await DeckSupabaseRepository.deleteDeck(deckId)) ??
        DeckRepository.deleteDeck(deckId)
      );
    } catch (error) {
      console.warn("Life Cards Supabase deck delete failed", error);
      return DeckRepository.deleteDeck(deckId);
    }
  },

  reorderDecks(nextDecks: Deck[]) {
    writeStoredDecks(nextDecks);
    return nextDecks;
  },

  async reorderDecksForCurrentUser(nextDecks: Deck[]) {
    try {
      return (
        (await DeckSupabaseRepository.reorderDecks(nextDecks)) ??
        DeckRepository.reorderDecks(nextDecks)
      );
    } catch (error) {
      console.warn("Life Cards Supabase deck reorder failed", error);
      return DeckRepository.reorderDecks(nextDecks);
    }
  },
};
