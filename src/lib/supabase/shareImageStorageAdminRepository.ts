import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Card } from "@/lib/types";

const CARD_IMAGES_BUCKET = "card-images";

const cardImageExtensionsByContentType = {
  "image/jpeg": "jpg",
  "image/webp": "webp",
} as const;

type CardImageContentType = keyof typeof cardImageExtensionsByContentType;

function isAllowedCardImageContentType(
  value: string,
): value is CardImageContentType {
  return value in cardImageExtensionsByContentType;
}

function isLocalOrPrivateHostname(hostname: string) {
  const normalizedHostname = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  const ipv4Parts = normalizedHostname.split(".").map((part) => Number(part));

  if (
    normalizedHostname === "localhost" ||
    normalizedHostname === "::1" ||
    normalizedHostname.startsWith("127.") ||
    normalizedHostname.startsWith("169.254.")
  ) {
    return true;
  }

  if (
    ipv4Parts.length === 4 &&
    ipv4Parts.every((part) => Number.isInteger(part) && part >= 0 && part <= 255)
  ) {
    const [first, second] = ipv4Parts;

    return (
      first === 10 ||
      (first === 172 && second >= 16 && second <= 31) ||
      (first === 192 && second === 168)
    );
  }

  return (
    normalizedHostname.startsWith("fc") ||
    normalizedHostname.startsWith("fd") ||
    normalizedHostname.startsWith("fe80:")
  );
}

function allowedSupabaseStorageOrigin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!supabaseUrl) {
    return "";
  }

  try {
    const parsedUrl = new URL(supabaseUrl);

    if (isLocalOrPrivateHostname(parsedUrl.hostname)) {
      return "";
    }

    return parsedUrl.origin;
  } catch {
    return "";
  }
}

function allowedDisplayImageUrl(imagePath: string) {
  const allowedOrigin = allowedSupabaseStorageOrigin();

  if (!allowedOrigin) {
    return null;
  }

  try {
    const parsedUrl = new URL(imagePath);

    if (
      parsedUrl.protocol !== "https:" ||
      parsedUrl.origin !== allowedOrigin ||
      isLocalOrPrivateHostname(parsedUrl.hostname)
    ) {
      return null;
    }

    return parsedUrl;
  } catch {
    return null;
  }
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

function normalizeImageBlob(blob: Blob, fallbackPath = "") {
  const contentType = blob.type || contentTypeFromPath(fallbackPath);

  if (!isAllowedCardImageContentType(contentType)) {
    throw new Error("Share image copy requires image/webp or image/jpeg content.");
  }

  return blob.type === contentType ? blob : new Blob([blob], { type: contentType });
}

async function fetchDisplayImageAsBlob(imagePath: string) {
  const allowedImageUrl = allowedDisplayImageUrl(imagePath);

  if (!allowedImageUrl) {
    throw new Error("Share image fallback URL is not allowed.");
  }

  const response = await fetch(allowedImageUrl);

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
