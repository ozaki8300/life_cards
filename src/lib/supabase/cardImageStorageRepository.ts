"use client";

import { dataUrlToBlob } from "@/lib/imageCompression";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const CARD_IMAGES_BUCKET = "card-images";
const SIGNED_URL_EXPIRES_IN_SECONDS = 60 * 60 * 24;

function isDataUrl(value: string) {
  return value.startsWith("data:");
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
  return `${userId}/cards/${cardId}/front.webp`;
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
    const path = cardImagePath(client.userId, cardId);
    const { error } = await client.supabase.storage
      .from(CARD_IMAGES_BUCKET)
      .upload(path, blob, {
        contentType: blob.type || "image/webp",
        upsert: true,
      });

    if (error) {
      throw error;
    }

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
