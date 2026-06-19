const shareImageContentTypesByExtension = {
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  webp: "image/webp",
} as const;

type ShareImageExtension = keyof typeof shareImageContentTypesByExtension;

export type ShareImageContentType =
  (typeof shareImageContentTypesByExtension)[ShareImageExtension];

export function normalizeShareToken(token: string) {
  const trimmedToken = token.trim();

  if (!/^[A-Za-z0-9_-]+$/.test(trimmedToken)) {
    return "";
  }

  return trimmedToken;
}

export function isShareImageStoragePathForToken(path: string, token: string) {
  const normalizedPath = path.trim().replace(/^\/+/, "");
  const normalizedToken = normalizeShareToken(token);

  if (!normalizedToken) {
    return false;
  }

  return [
    `share-images/${normalizedToken}/front.webp`,
    `share-images/${normalizedToken}/front.jpg`,
    `share-images/${normalizedToken}/front.jpeg`,
  ].includes(normalizedPath);
}

export function contentTypeForShareImageStoragePath(path: string) {
  const extension = path.trim().toLowerCase().split(".").pop() ?? "";

  return extension in shareImageContentTypesByExtension
    ? shareImageContentTypesByExtension[extension as ShareImageExtension]
    : "";
}
