"use client";

import { dataUrlToBlob } from "@/lib/imageCompression";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const CARD_IMAGES_BUCKET = "card-images";
const SIGNED_URL_EXPIRES_IN_SECONDS = 60 * 60 * 24;

type SignedImageUrlCacheEntry = {
  expiresAt: number;
  signedUrl: string;
};

const signedImageUrlCache = new Map<string, SignedImageUrlCacheEntry>();
const expectedPolicyPathPrefix = "users/{userId}/cards/{cardId}/front.webp";

function isDataUrl(value: string) {
  return value.startsWith("data:");
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
  const {
    data: { session },
  } = await supabase.auth.getSession();
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
      console.warn("Life Cards Supabase image upload skipped", {
        cardId,
        reason: "missing-session",
      });
      return null;
    }

    const blob = imageBodyToBlob(image);
    const path = cardImagePath(client.userId, cardId);
    const bucketDiagnostic = await client.supabase.storage.listBuckets();

    console.warn("Life Cards Supabase image upload start", {
      blobSize: blob.size,
      bucket: CARD_IMAGES_BUCKET,
      bucketCheckError: supabaseErrorLog(bucketDiagnostic.error),
      bucketExists: bucketDiagnostic.data?.some(
        (bucket) => bucket.name === CARD_IMAGES_BUCKET,
      ),
      cardId,
      contentType: blob.type || "image/webp",
      path,
      policyExpectedPathExample: expectedPolicyPathPrefix,
      userId: client.userId,
    });

    const { error } = await client.supabase.storage
      .from(CARD_IMAGES_BUCKET)
      .upload(path, blob, {
        contentType: blob.type || "image/webp",
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

    console.warn("Life Cards Supabase image upload success", {
      bucket: CARD_IMAGES_BUCKET,
      cardId,
      path,
    });

    return path;
  },

  async getSignedImageUrl(path: string) {
    const client = await getClient();

    if (!client || !path) {
      return null;
    }

    const { data, error } = await client.supabase.storage
      .from(CARD_IMAGES_BUCKET)
      .createSignedUrl(path, SIGNED_URL_EXPIRES_IN_SECONDS);

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

    const { error } = await client.supabase.storage
      .from(CARD_IMAGES_BUCKET)
      .remove([path]);

    if (error) {
      throw error;
    }

    return true;
  },
};
