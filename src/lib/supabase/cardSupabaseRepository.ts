"use client";

import { CardSaveError } from "@/lib/cardSaveErrors";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { CardImageStorageRepository } from "@/lib/supabase/cardImageStorageRepository";
import type { Card, CardImageFitMode, DefaultCardImageKey } from "@/lib/types";

type SupabaseCardRow = {
  back_text: string | null;
  created_at: string;
  deck_id: string;
  default_image_key: string | null;
  front_comment: string | null;
  front_text: string | null;
  id: string;
  image_fit_mode: string | null;
  image_path: string | null;
  is_favorite: boolean;
  link_url: string | null;
  updated_at: string;
};

const cardsTableName = "cards";
const cardsUpsertOnConflict = "user_id,id";
const defaultImageKeys = new Set<DefaultCardImageKey>([
  "night",
  "sea",
  "mountain",
  "library",
]);

function rowDefaultImageKeyToCard(
  value: string | null | undefined,
): DefaultCardImageKey | undefined {
  return defaultImageKeys.has(value as DefaultCardImageKey)
    ? (value as DefaultCardImageKey)
    : undefined;
}

function normalizeImageFitMode(value: string | null | undefined): CardImageFitMode {
  if (value === "blurExtend" || value === "blur_extend") {
    return "blurExtend";
  }

  return "cover";
}

function rowImageFitModeToCard(value: string | null): CardImageFitMode {
  return normalizeImageFitMode(value);
}

function cardImageFitModeToRow(card: Card): CardImageFitMode {
  return normalizeImageFitMode(card.imageFitMode);
}

function isDataUrl(value: string) {
  return value.startsWith("data:");
}

function isDisplayOnlyImagePath(value: string) {
  return value.startsWith("http://") || value.startsWith("https://") || value.startsWith("/");
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

function imagePathKind(value: string) {
  if (!value) {
    return "empty";
  }

  if (isDataUrl(value)) {
    return "data-url";
  }

  if (isDisplayOnlyImagePath(value)) {
    return "display-url";
  }

  return "storage-path";
}

function rowToCard(row: SupabaseCardRow): Card {
  const storedImagePath = row.image_path ?? "";
  const imagePath = isDisplayOnlyImagePath(storedImagePath) || isDataUrl(storedImagePath)
    ? storedImagePath
    : "";

  return {
    backText: row.back_text ?? "",
    createdAt: row.created_at,
    deckId: row.deck_id,
    defaultImageKey: rowDefaultImageKeyToCard(row.default_image_key),
    frontComment: row.front_comment ?? "",
    frontText: row.front_text ?? "",
    id: row.id,
    imageFitMode: rowImageFitModeToCard(row.image_fit_mode),
    imagePath,
    imageStoragePath: imagePath ? "" : storedImagePath,
    isFavorite: row.is_favorite,
    linkUrl: row.link_url ?? "",
    updatedAt: row.updated_at,
  };
}

async function getStoredImagePath(
  client: NonNullable<Awaited<ReturnType<typeof getClient>>>,
  cardId: string,
) {
  const { data, error } = await client.supabase
    .from("cards")
    .select("image_path")
    .eq("user_id", client.userId)
    .eq("id", cardId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as Pick<SupabaseCardRow, "image_path"> | null)?.image_path ?? "";
}

async function removeStoredImagePath(path: string) {
  try {
    await CardImageStorageRepository.removeCardImage(path);
  } catch (error) {
    console.warn("Life Cards Supabase image remove failed", error);
  }
}

async function resolveImagePathForSave(
  card: Card,
  client: NonNullable<Awaited<ReturnType<typeof getClient>>>,
) {
  const imagePath = (card.imagePath ?? "").trim();
  const imageStoragePath = (card.imageStoragePath ?? "").trim();

  if (!imagePath) {
    if (imageStoragePath) {
      return imageStoragePath;
    }

    const storedPath = await getStoredImagePath(client, card.id);

    if (storedPath) {
      await removeStoredImagePath(storedPath);
    }

    return "";
  }

  if (isDataUrl(imagePath)) {
    try {
      const uploadedPath = await CardImageStorageRepository.uploadCardImage(
        card.id,
        imagePath,
      );

      if (!uploadedPath) {
        throw new Error("Card image upload requires an active Supabase session.");
      }

      return uploadedPath;
    } catch (error) {
      console.warn("Life Cards Supabase image upload failed", {
        cardId: card.id,
        error: supabaseErrorLog(error),
      });
      throw new CardSaveError(
        "image-upload-failed",
        "Card image upload failed.",
        error,
      );
    }
  }

  if (isDisplayOnlyImagePath(imagePath)) {
    return imageStoragePath || getStoredImagePath(client, card.id);
  }

  return imagePath;
}

async function cardToRow(
  card: Card,
  client: NonNullable<Awaited<ReturnType<typeof getClient>>>,
) {
  const resolvedImagePath = await resolveImagePathForSave(card, client);

  const row = {
    back_text: card.backText ?? "",
    created_at: card.createdAt,
    deck_id: card.deckId,
    default_image_key: card.defaultImageKey ?? null,
    front_comment: card.frontComment ?? "",
    front_text: card.frontText ?? "",
    id: card.id,
    image_fit_mode: cardImageFitModeToRow(card),
    image_path: resolvedImagePath,
    is_favorite: Boolean(card.isFavorite),
    link_url: card.linkUrl?.trim() || null,
    updated_at: card.updatedAt,
    user_id: client.userId,
  };

  return row;
}

async function persistImageFitMode(
  client: NonNullable<Awaited<ReturnType<typeof getClient>>>,
  cardId: string,
  imageFitMode: CardImageFitMode,
) {
  const { error } = await client.supabase
    .from("cards")
    .update({
      image_fit_mode: imageFitMode,
    })
    .eq("user_id", client.userId)
    .eq("id", cardId);

  if (error) {
    console.warn("Life Cards Supabase image_fit_mode persist error", {
      cardId,
      error: supabaseErrorLog(error),
      imageFitMode,
      userId: client.userId,
    });
    throw error;
  }
}

async function getClient() {
  const supabase = createSupabaseBrowserClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const userId = session?.user.id;

  return userId ? { supabase, userId } : null;
}

async function fetchCards(
  client: NonNullable<Awaited<ReturnType<typeof getClient>>>,
) {
  const { data, error } = await client.supabase
    .from("cards")
    .select(
      "id,deck_id,front_text,front_comment,back_text,image_path,image_fit_mode,default_image_key,is_favorite,link_url,created_at,updated_at",
    )
    .order("updated_at", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.warn("Life Cards Supabase cards fetch error", {
      error: supabaseErrorLog(error),
      userId: client.userId,
    });
    throw error;
  }

  return ((data ?? []) as SupabaseCardRow[]).map(rowToCard);
}

export const CardSupabaseRepository = {
  async getCards() {
    const client = await getClient();

    return client ? fetchCards(client) : null;
  },

  async saveCard(card: Card) {
    const client = await getClient();

    if (!client) {
      return null;
    }

    const row = await cardToRow(card, client);

    const { error } = await client.supabase
      .from(cardsTableName)
      .upsert(row, {
        onConflict: cardsUpsertOnConflict,
      });

    if (error) {
      console.warn("Life Cards Supabase card upsert error", {
        cardId: row.id,
        error: supabaseErrorLog(error),
        imagePathKind: imagePathKind(row.image_path),
      });
      throw error;
    }

    await persistImageFitMode(client, row.id, row.image_fit_mode);

    return fetchCards(client);
  },

  async updateCard(card: Card) {
    return CardSupabaseRepository.saveCard(card);
  },

  async deleteCard(cardId: string) {
    const client = await getClient();

    if (!client) {
      return null;
    }

    const storedPath = await getStoredImagePath(client, cardId);

    const { error } = await client.supabase
      .from("cards")
      .delete()
      .eq("user_id", client.userId)
      .eq("id", cardId);

    if (error) {
      throw error;
    }

    if (storedPath) {
      await removeStoredImagePath(storedPath);
    }

    return fetchCards(client);
  },

  async moveCardsToDeck(fromDeckId: string, toDeckId: string) {
    const client = await getClient();

    if (!client) {
      return null;
    }

    const updatedAt = new Date().toISOString().slice(0, 10);
    const { error } = await client.supabase
      .from("cards")
      .update({
        deck_id: toDeckId,
        updated_at: updatedAt,
      })
      .eq("user_id", client.userId)
      .eq("deck_id", fromDeckId);

    if (error) {
      throw error;
    }

    return fetchCards(client);
  },
};
