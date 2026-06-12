import type { Card, DefaultCardImageKey } from "./types";

const CARD_DEFAULT_IMAGE_KEYS_STORAGE_KEY =
  "life_cards.card_default_image_keys";
const DEFAULT_CARD_IMAGE_KEY: DefaultCardImageKey = "paper";
const defaultImageKeys = new Set<DefaultCardImageKey>([
  "paper",
  "night",
  "sea",
  "mountain",
  "library",
]);

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function normalizeDefaultImageKey(
  value: string | null | undefined,
): DefaultCardImageKey {
  return defaultImageKeys.has(value as DefaultCardImageKey)
    ? (value as DefaultCardImageKey)
    : DEFAULT_CARD_IMAGE_KEY;
}

function readStoredDefaultImageKeys() {
  if (!canUseStorage()) {
    return {};
  }

  const storedValue = window.localStorage.getItem(
    CARD_DEFAULT_IMAGE_KEYS_STORAGE_KEY,
  );

  if (!storedValue) {
    return {};
  }

  try {
    const parsedValue = JSON.parse(storedValue);

    return parsedValue && typeof parsedValue === "object"
      ? (parsedValue as Record<string, string>)
      : {};
  } catch {
    return {};
  }
}

function writeStoredDefaultImageKeys(keysByCardId: Record<string, string>) {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(
    CARD_DEFAULT_IMAGE_KEYS_STORAGE_KEY,
    JSON.stringify(keysByCardId),
  );
}

export function hydrateCardDefaultImageKeys(cards: Card[]) {
  const keysByCardId = readStoredDefaultImageKeys();

  return cards.map((card) => ({
    ...card,
    defaultImageKey: normalizeDefaultImageKey(
      card.defaultImageKey ?? keysByCardId[card.id],
    ),
  }));
}

export function rememberCardDefaultImageKey(card: Card) {
  if (!card.id) {
    return;
  }

  const keysByCardId = readStoredDefaultImageKeys();
  keysByCardId[card.id] = normalizeDefaultImageKey(card.defaultImageKey);
  writeStoredDefaultImageKeys(keysByCardId);
}
