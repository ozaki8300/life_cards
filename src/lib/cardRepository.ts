import { cards as seedCards } from "@/data/cards/cards";
import {
  hydrateCardDefaultImageKeys,
  rememberCardDefaultImageKey,
} from "@/lib/cardDefaultImageKeys";
import { CardSupabaseRepository } from "@/lib/supabase/cardSupabaseRepository";
import type { Card, CardImageFrameMode } from "@/lib/types";

import { CardSaveError } from "./cardSaveErrors";
import { STORAGE_KEYS } from "./storageKeys";

type CardSaveOptions = {
  expectsCloudSave?: boolean;
};

type CurrentUserReadOptions = {
  disableFallback?: boolean;
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

function normalizeImageFrameMode(
  value: string | null | undefined,
): CardImageFrameMode {
  return value === "paper" ? "paper" : "none";
}

function readStoredImageFrameModes() {
  if (!canUseStorage()) {
    return {};
  }

  const storedValue = window.localStorage.getItem(STORAGE_KEYS.imageFrameModes);

  if (!storedValue) {
    return {};
  }

  try {
    const parsedValue = JSON.parse(storedValue);

    if (!parsedValue || typeof parsedValue !== "object" || Array.isArray(parsedValue)) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(parsedValue as Record<string, unknown>).flatMap(
        ([cardId, value]) =>
          typeof cardId === "string" && value === "paper"
            ? [[cardId, "paper" as CardImageFrameMode]]
            : [],
      ),
    );
  } catch (error) {
    console.warn("Life Cards image frame mode storage parse failed", error);
    return {};
  }
}

function writeStoredImageFrameModes(
  imageFrameModes: Record<string, CardImageFrameMode>,
) {
  if (!canUseStorage()) {
    return;
  }

  const paperModes = Object.fromEntries(
    Object.entries(imageFrameModes).filter(([, mode]) => mode === "paper"),
  );

  window.localStorage.setItem(
    STORAGE_KEYS.imageFrameModes,
    JSON.stringify(paperModes),
  );
}

function rememberCardImageFrameMode(card: Card) {
  if (!canUseStorage()) {
    return;
  }

  const imageFrameModes = readStoredImageFrameModes();
  const imageFrameMode = normalizeImageFrameMode(card.imageFrameMode);

  if (imageFrameMode === "paper") {
    imageFrameModes[card.id] = "paper";
  } else {
    delete imageFrameModes[card.id];
  }

  writeStoredImageFrameModes(imageFrameModes);
}

function forgetCardImageFrameMode(cardId: string) {
  if (!canUseStorage()) {
    return;
  }

  const imageFrameModes = readStoredImageFrameModes();
  delete imageFrameModes[cardId];
  writeStoredImageFrameModes(imageFrameModes);
}

function hydrateCardImageFrameModes(cards: Card[]) {
  const imageFrameModes = readStoredImageFrameModes();

  return cards.map((card) => ({
    ...card,
    imageFrameMode: normalizeImageFrameMode(
      card.imageFrameMode ?? imageFrameModes[card.id],
    ),
  }));
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
    return hydrateCardImageFrameModes(
      hydrateCardDefaultImageKeys(readStoredCards() ?? seed),
    );
  },

  async getCardsForCurrentUser(
    seed: Card[] = seedCards,
    options: CurrentUserReadOptions = {},
  ) {
    try {
      const supabaseCards = await CardSupabaseRepository.getCards();

      if (supabaseCards) {
        return hydrateCardImageFrameModes(
          hydrateCardDefaultImageKeys(supabaseCards),
        );
      }

      if (options.disableFallback) {
        return [];
      }

      return CardRepository.getCards(seed);
    } catch (error) {
      console.warn("Life Cards Supabase cards fetch failed", error);

      if (options.disableFallback) {
        throw error;
      }

      return CardRepository.getCards(seed);
    }
  },

  saveCard(card: Card, seed: Card[] = seedCards) {
    rememberCardDefaultImageKey(card);
    rememberCardImageFrameMode(card);
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
        rememberCardDefaultImageKey(card);
        rememberCardImageFrameMode(card);
        return hydrateCardImageFrameModes(hydrateCardDefaultImageKeys(savedCards));
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
    rememberCardDefaultImageKey(card);
    rememberCardImageFrameMode(card);
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
        rememberCardDefaultImageKey(card);
        rememberCardImageFrameMode(card);
        return hydrateCardImageFrameModes(hydrateCardDefaultImageKeys(savedCards));
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

    forgetCardImageFrameMode(cardId);
    writeStoredCards(nextCards);
    return nextCards;
  },

  async deleteCardForCurrentUser(cardId: string, seed: Card[] = seedCards) {
    try {
      const deletedCards = await CardSupabaseRepository.deleteCard(cardId);

      if (deletedCards) {
        forgetCardImageFrameMode(cardId);
        return hydrateCardImageFrameModes(hydrateCardDefaultImageKeys(deletedCards));
      }

      return CardRepository.deleteCard(cardId, seed);
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
