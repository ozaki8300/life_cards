import { cards as seedCards } from "@/data/cards/cards";
import { CardSupabaseRepository } from "@/lib/supabase/cardSupabaseRepository";
import type { Card } from "@/lib/types";

import { CardSaveError } from "./cardSaveErrors";
import { STORAGE_KEYS } from "./storageKeys";

type CardSaveOptions = {
  expectsCloudSave?: boolean;
};

function errorCauseLog(error: unknown) {
  if (!error || typeof error !== "object") {
    return undefined;
  }

  return (error as { cause?: unknown }).cause;
}

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

  assertNoLocalDataUrlImages(cards);
  window.localStorage.setItem(STORAGE_KEYS.cards, JSON.stringify(cards));
}

function isDataUrl(value: string | null | undefined) {
  return value?.trim().startsWith("data:") ?? false;
}

function assertNoLocalDataUrlImages(cards: Card[]) {
  const cardWithLocalImage = cards.find((card) => isDataUrl(card.imagePath));

  if (cardWithLocalImage) {
    throw new CardSaveError(
      "local-image-not-allowed",
      "localStorage card saves cannot include data URL images.",
    );
  }
}

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

export const CardRepository = {
  getCards(seed: Card[] = seedCards) {
    return readStoredCards() ?? seed;
  },

  async getCardsForCurrentUser(seed: Card[] = seedCards) {
    try {
      return (
        (await CardSupabaseRepository.getCards()) ??
        CardRepository.getCards(seed)
      );
    } catch (error) {
      console.warn("Life Cards Supabase cards fetch failed", error);
      return CardRepository.getCards(seed);
    }
  },

  saveCard(card: Card, seed: Card[] = seedCards) {
    const cards = CardRepository.getCards(seed);
    const nextCards = cards.some((item) => item.id === card.id)
      ? cards.map((item) => (item.id === card.id ? card : item))
      : [...cards, card];

    writeStoredCards(nextCards);
    return nextCards;
  },

  async saveCardForCurrentUser(
    card: Card,
    seed: Card[] = seedCards,
    options: CardSaveOptions = {},
  ) {
    try {
      const savedCards = await CardSupabaseRepository.saveCard(card);

      if (savedCards) {
        return savedCards;
      }

      if (options.expectsCloudSave) {
        throw new CardSaveError(
          "cloud-save-failed",
          "Cloud card save requires an active Supabase session.",
        );
      }

      return CardRepository.saveCard(card, seed);
    } catch (error) {
      console.warn("Life Cards Supabase card save failed", {
        cause: errorCauseLog(error),
        error,
      });

      if (error instanceof CardSaveError) {
        throw error;
      }

      const message =
        error instanceof Error ? error.message : "Supabase card save failed.";

      throw new CardSaveError("cloud-save-failed", message, error);
    }
  },

  updateCard(card: Card, seed: Card[] = seedCards) {
    const cards = CardRepository.getCards(seed);
    const nextCards = cards.map((item) => (item.id === card.id ? card : item));

    writeStoredCards(nextCards);
    return nextCards;
  },

  async updateCardForCurrentUser(
    card: Card,
    seed: Card[] = seedCards,
    options: CardSaveOptions = {},
  ) {
    try {
      const savedCards = await CardSupabaseRepository.updateCard(card);

      if (savedCards) {
        return savedCards;
      }

      if (options.expectsCloudSave) {
        throw new CardSaveError(
          "cloud-save-failed",
          "Cloud card update requires an active Supabase session.",
        );
      }

      return CardRepository.updateCard(card, seed);
    } catch (error) {
      console.warn("Life Cards Supabase card update failed", {
        cause: errorCauseLog(error),
        error,
      });

      if (error instanceof CardSaveError) {
        throw error;
      }

      const message =
        error instanceof Error ? error.message : "Supabase card update failed.";

      throw new CardSaveError("cloud-save-failed", message, error);
    }
  },

  deleteCard(cardId: string, seed: Card[] = seedCards) {
    const cards = CardRepository.getCards(seed);
    const nextCards = cards.filter((card) => card.id !== cardId);

    writeStoredCards(nextCards);
    return nextCards;
  },

  async deleteCardForCurrentUser(cardId: string, seed: Card[] = seedCards) {
    try {
      return (
        (await CardSupabaseRepository.deleteCard(
          cardId,
        )) ?? CardRepository.deleteCard(cardId, seed)
      );
    } catch (error) {
      console.warn("Life Cards Supabase card delete failed", error);
      return CardRepository.deleteCard(cardId, seed);
    }
  },

  moveCardsToDeck(
    fromDeckId: string,
    toDeckId: string,
    seed: Card[] = seedCards,
  ) {
    const cards = CardRepository.getCards(seed);
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

  async moveCardsToDeckForCurrentUser(
    fromDeckId: string,
    toDeckId: string,
    seed: Card[] = seedCards,
  ) {
    try {
      return (
        (await CardSupabaseRepository.moveCardsToDeck(
          fromDeckId,
          toDeckId,
        )) ?? CardRepository.moveCardsToDeck(fromDeckId, toDeckId, seed)
      );
    } catch (error) {
      console.warn("Life Cards Supabase card move failed", error);
      return CardRepository.moveCardsToDeck(fromDeckId, toDeckId, seed);
    }
  },
};
