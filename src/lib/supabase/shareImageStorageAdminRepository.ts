import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Card } from "@/lib/types";

const CARD_IMAGES_BUCKET = "card-images";

const cardImageExtensionsByContentType = {
  "image/jpeg": "jpg",
  "image/webp": "webp",
} as const;

type CardImageContentType = keyof typeof cardImageExtensionsByContentType;

function isDataUrl(value: string) {
  return value.startsWith("data:");
}

function isAllowedCardImageContentType(
  value: string,
): value is CardImageContentType {
  return value in cardImageExtensionsByContentType;
}

function contentTypeFromPath(path: string) {
  const normalizedPath = path.toLowerCase();

  if (normalizedPath.endsWith(".jpg") || normalizedPath.endsWith(".jpeg")) {
    return "image/jpeg";
  }

  if (normalizedPath.endsWith(".webp")) {
    return "image/webp";
  }

  return "";
}

function assertShareToken(token: string) {
  const trimmedToken = token.trim();

  if (!/^[A-Za-z0-9_-]+$/.test(trimmedToken)) {
    throw new Error("Share image token contains unsupported characters.");
  }

  return trimmedToken;
}

function assertUserStoragePath(path: string, userId: string) {
  const normalizedPath = path.trim().replace(/^\/+/, "");
  const expectedPrefix = `users/${userId}/`;

  if (!normalizedPath.startsWith(expectedPrefix)) {
    throw new Error("Card image storage path is outside the current user scope.");
  }

  return normalizedPath;
}

function shareCardImagePath(token: string, contentType: CardImageContentType) {
  const extension = cardImageExtensionsByContentType[contentType];

  return `share-images/${assertShareToken(token)}/front.${extension}`;
}

function dataUrlToServerBlob(dataUrl: string) {
  const [metadata, base64Data] = dataUrl.split(",");
  const mimeType = metadata.match(/^data:([^;]+);base64$/)?.[1];

  if (!mimeType || !base64Data) {
    throw new Error("Invalid data URL");
  }

  return new Blob([Buffer.from(base64Data, "base64")], { type: mimeType });
}

function normalizeImageBlob(blob: Blob, fallbackPath = "") {
  const contentType = blob.type || contentTypeFromPath(fallbackPath);

  if (!isAllowedCardImageContentType(contentType)) {
    throw new Error("Share image copy requires image/webp or image/jpeg content.");
  }

  return blob.type === contentType ? blob : new Blob([blob], { type: contentType });
}

async function fetchDisplayImageAsBlob(imagePath: string) {
  if (isDataUrl(imagePath)) {
    return normalizeImageBlob(dataUrlToServerBlob(imagePath));
  }

  const response = await fetch(imagePath);

  if (!response.ok) {
    throw new Error(`Share image fetch failed: ${response.status}`);
  }

  return normalizeImageBlob(await response.blob(), imagePath);
}

export const ShareImageStorageAdminRepository = {
  async copyCardImageToShareImage({
    card,
    token,
    userId,
  }: {
    card: Card;
    token: string;
    userId: string;
  }) {
    const admin = createSupabaseAdminClient();
    const imageStoragePath = card.imageStoragePath?.trim() ?? "";
    const imagePath = card.imagePath?.trim() ?? "";
    let sourceBlob: Blob | null = null;

    if (imageStoragePath) {
      const scopedPath = assertUserStoragePath(imageStoragePath, userId);
      const { data, error } = await admin.storage
        .from(CARD_IMAGES_BUCKET)
        .download(scopedPath);

      if (error) {
        throw error;
      }

      sourceBlob = normalizeImageBlob(data, scopedPath);
    } else if (imagePath) {
      sourceBlob = await fetchDisplayImageAsBlob(imagePath);
    }

    if (!sourceBlob) {
      return null;
    }

    const contentType = sourceBlob.type;

    if (!isAllowedCardImageContentType(contentType)) {
      throw new Error("Share image upload requires image/webp or image/jpeg content.");
    }

    const path = shareCardImagePath(token, contentType);
    const { error } = await admin.storage
      .from(CARD_IMAGES_BUCKET)
      .upload(path, sourceBlob, {
        contentType,
        upsert: true,
      });

    if (error) {
      throw error;
    }

    return path;
  },
};
