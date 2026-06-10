const gradients = [
  "linear-gradient(145deg, #fffaf0 0%, #f3eadc 100%)",
  "linear-gradient(145deg, #fff8ea 0%, #edf4eb 100%)",
  "linear-gradient(145deg, #fff7ec 0%, #f4eddf 100%)",
];

const defaultCardImages = [
  "/card-images/default-library.webp",
  "/card-images/default-night.webp",
  "/card-images/default-mountain.webp",
  "/card-images/default-sea.webp",
] as const;

function stableImageIndex(seed: string) {
  let hash = 5381;

  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 33) ^ seed.charCodeAt(index);
  }

  return (hash >>> 0) % defaultCardImages.length;
}

export function gradientFor(index: number) {
  return gradients[index % gradients.length];
}

export function defaultImageForCard(cardId: string): string;
export function defaultImageForCard(): string;
export function defaultImageForCard(cardId = "life-cards-default") {
  const seed = cardId.trim() || "life-cards-default";

  return defaultCardImages[stableImageIndex(seed)];
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
