import type { Card, DefaultCardImageKey } from "@/lib/types";

const gradients = [
  "linear-gradient(145deg, #fffaf0 0%, #f3eadc 100%)",
  "linear-gradient(145deg, #fff8ea 0%, #edf4eb 100%)",
  "linear-gradient(145deg, #fff7ec 0%, #f4eddf 100%)",
];

export const DEFAULT_CARD_IMAGE_KEY = "night";
export const DEFAULT_CARD_IMAGE_OPTIONS = [
  {
    key: "night",
    label: "Night",
    path: "/card-images/default-night.webp",
  },
  {
    key: "sea",
    label: "Sea",
    path: "/card-images/default-sea.webp",
  },
  {
    key: "mountain",
    label: "Mountain",
    path: "/card-images/default-mountain.webp",
  },
  {
    key: "library",
    label: "Library",
    path: "/card-images/default-library.webp",
  },
] as const;

export function isDefaultCardImageKey(
  value: string | null | undefined,
): value is DefaultCardImageKey {
  return DEFAULT_CARD_IMAGE_OPTIONS.some((option) => option.key === value);
}

export function gradientFor(index: number) {
  return gradients[index % gradients.length];
}

export function normalizeDefaultImageKey(
  key: string | null | undefined,
): DefaultCardImageKey {
  return isDefaultCardImageKey(key) ? key : DEFAULT_CARD_IMAGE_KEY;
}

export function defaultImageForKey(key?: DefaultCardImageKey | string | null) {
  const selectedKey = normalizeDefaultImageKey(key);
  return (
    DEFAULT_CARD_IMAGE_OPTIONS.find((option) => option.key === selectedKey)
      ?.path ?? DEFAULT_CARD_IMAGE_OPTIONS[0].path
  );
}

export function defaultImageForCard(card?: Pick<Card, "defaultImageKey"> | null) {
  return defaultImageForKey(card?.defaultImageKey);
}

export function formatDate(date: string) {
  const datePart = date.match(/^\d{4}-\d{2}-\d{2}/)?.[0] ?? date;

  return datePart.replaceAll("-", ".");
}

export function isEditableElement(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return Boolean(target.closest("input, textarea, select, [contenteditable='true']"));
}
