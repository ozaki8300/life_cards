"use client";

import { dataUrlToBlob } from "@/lib/imageCompression";
import {
  createSupabaseBrowserClient,
  getSupabaseSessionSafely,
} from "@/lib/supabase/client";

const CARD_IMAGES_BUCKET = "card-images";
const CARD_IMAGE_CONTENT_TYPE = "image/webp";
const SIGNED_URL_EXPIRES_IN_SECONDS = 60 * 60 * 24;

type SignedImageUrlCacheEntry = {
  expiresAt: number;
  signedUrl: string;
};

const signedImageUrlCache = new Map<string, SignedImageUrlCacheEntry>();

function isDataUrl(value: string) {
  return value.startsWith("data:");
}

function userStoragePrefix(userId: string) {
  return `users/${userId}/`;
}

function assertUserStoragePath(path: string, userId: string) {
  const normalizedPath = path.trim().replace(/^\/+/, "");
  const expectedPrefix = userStoragePrefix(userId);

  if (!normalizedPath.startsWith(expectedPrefix)) {
    throw new Error("Card image storage path is outside the current user scope.");
  }

  return normalizedPath;
}

function supabaseErrorLog(error: unknown) {
  if (!error || typeof error !== "object") {
    return error;
  }

  const errorRecord = error as Record<string, unknown>;

  return {
    code: errorRecord.code,
    details: errorRecord.details,
    hint: errorRecord.hint,
    message: errorRecord.message,
    name: errorRecord.name,
    status: errorRecord.status,
    statusCode: errorRecord.statusCode,
  };
}

async function getClient() {
  const supabase = createSupabaseBrowserClient();
  const session = await getSupabaseSessionSafely(supabase);
  const userId = session?.user.id;

  return userId ? { supabase, userId } : null;
}

function cardImagePath(userId: string, cardId: string) {
  return `users/${userId}/cards/${cardId}/front.webp`;
}

function imageBodyToBlob(image: Blob | string) {
  if (typeof image !== "string") {
    return image;
  }

  if (!isDataUrl(image)) {
    throw new Error("Card image upload requires a data URL or Blob");
  }

  return dataUrlToBlob(image);
}

export const CardImageStorageRepository = {
  async uploadCardImage(cardId: string, image: Blob | string) {
    const client = await getClient();

    if (!client) {
      return null;
    }

    const blob = imageBodyToBlob(image);

    if (blob.type !== CARD_IMAGE_CONTENT_TYPE) {
      throw new Error("Card image upload requires image/webp content.");
    }

    const path = assertUserStoragePath(
      cardImagePath(client.userId, cardId),
      client.userId,
    );

    const { error } = await client.supabase.storage
      .from(CARD_IMAGES_BUCKET)
      .upload(path, blob, {
        contentType: CARD_IMAGE_CONTENT_TYPE,
        upsert: true,
      });

    if (error) {
      console.warn("Life Cards Supabase image upload error", {
        bucket: CARD_IMAGES_BUCKET,
        cardId,
        error: supabaseErrorLog(error),
        path,
      });
      throw error;
    }

    return path;
  },

  async getSignedImageUrl(path: string) {
    const client = await getClient();

    if (!client || !path) {
      return null;
    }

    const scopedPath = assertUserStoragePath(path, client.userId);

    const { data, error } = await client.supabase.storage
      .from(CARD_IMAGES_BUCKET)
      .createSignedUrl(scopedPath, SIGNED_URL_EXPIRES_IN_SECONDS);

    if (error) {
      throw error;
    }

    return data.signedUrl;
  },

  async getCachedSignedImageUrl(path: string) {
    const cachedEntry = signedImageUrlCache.get(path);

    if (cachedEntry && cachedEntry.expiresAt > Date.now()) {
      return cachedEntry.signedUrl;
    }

    const signedUrl = await CardImageStorageRepository.getSignedImageUrl(path);

    if (signedUrl) {
      signedImageUrlCache.set(path, {
        expiresAt: Date.now() + SIGNED_URL_EXPIRES_IN_SECONDS * 1000,
        signedUrl,
      });
    }

    return signedUrl;
  },

  async removeCardImage(path: string) {
    const client = await getClient();

    if (!client || !path) {
      return null;
    }

    const scopedPath = assertUserStoragePath(path, client.userId);

    const { error } = await client.supabase.storage
      .from(CARD_IMAGES_BUCKET)
      .remove([scopedPath]);

    if (error) {
      throw error;
    }

    return true;
  },
};
