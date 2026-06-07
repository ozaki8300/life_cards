const gradients = [
  "linear-gradient(145deg, #fffaf0 0%, #f3eadc 100%)",
  "linear-gradient(145deg, #fff8ea 0%, #edf4eb 100%)",
  "linear-gradient(145deg, #fff7ec 0%, #f4eddf 100%)",
];

const defaultCardImage = "/card-images/default-sea.webp";

const defaultCardImages = [
  defaultCardImage,
  "/card-images/default-library.webp",
  "/card-images/default-night.webp",
  "/card-images/default-mountain.webp",
] as const;

export function gradientFor(index: number) {
  return gradients[index % gradients.length];
}

export function defaultImageForCard(cardId: string) {
  const score = Array.from(cardId).reduce(
    (sum, char) => sum + char.charCodeAt(0),
    0,
  );

  return defaultCardImages[score % defaultCardImages.length] ?? defaultCardImage;
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
