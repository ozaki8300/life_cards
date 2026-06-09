"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { CardImageStorageRepository } from "@/lib/supabase/cardImageStorageRepository";
import type { Card, CardImageFitMode } from "@/lib/types";

type SupabaseCardRow = {
  back_text: string | null;
  created_at: string;
  deck_id: string;
  front_comment: string | null;
  front_text: string | null;
  id: string;
  image_fit_mode: string | null;
  image_path: string | null;
  is_favorite: boolean;
  link_url: string | null;
  updated_at: string;
};

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

function rowToCard(row: SupabaseCardRow): Card {
  const storedImagePath = row.image_path ?? "";
  const imagePath = isDisplayOnlyImagePath(storedImagePath) || isDataUrl(storedImagePath)
    ? storedImagePath
    : "";

  return {
    backText: row.back_text ?? "",
    createdAt: row.created_at,
    deckId: row.deck_id,
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
      return (await CardImageStorageRepository.uploadCardImage(
        card.id,
        imagePath,
      )) ?? "";
    } catch (error) {
      console.warn("Life Cards Supabase image upload failed", error);
      return "";
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
  return {
    back_text: card.backText ?? "",
    created_at: card.createdAt,
    deck_id: card.deckId,
    front_comment: card.frontComment ?? "",
    front_text: card.frontText ?? "",
    id: card.id,
    image_fit_mode: cardImageFitModeToRow(card),
    image_path: await resolveImagePathForSave(card, client),
    is_favorite: Boolean(card.isFavorite),
    link_url: card.linkUrl?.trim() || null,
    updated_at: card.updatedAt,
    user_id: client.userId,
  };
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
    throw error;
  }
}

async function verifyImageFitMode(
  client: NonNullable<Awaited<ReturnType<typeof getClient>>>,
  cardId: string,
) {
  const { data, error } = await client.supabase
    .from("cards")
    .select("image_fit_mode")
    .eq("user_id", client.userId)
    .eq("id", cardId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (
    (data as Pick<SupabaseCardRow, "image_fit_mode"> | null)?.image_fit_mode ??
    null
  );
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
      "id,deck_id,front_text,front_comment,back_text,image_path,image_fit_mode,is_favorite,link_url,created_at,updated_at",
    )
    .order("updated_at", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return ((data ?? []) as SupabaseCardRow[]).map(rowToCard);
}

export const CardSupabaseRepository = {
  async getCards() {
    const client = await getClient();

    return client ? fetchCards(client) : null;
  },

  async seedCardsIfEmpty(seedCards: Card[]) {
    const client = await getClient();

    if (!client) {
      return null;
    }

    const currentCards = await fetchCards(client);

    if (currentCards.length > 0) {
      return currentCards;
    }

    const rows = await Promise.all(
      seedCards.map((card) => cardToRow(card, client)),
    );

    if (rows.length === 0) {
      return [];
    }

    const { error } = await client.supabase
      .from("cards")
      .upsert(rows, { onConflict: "user_id,id" });

    if (error) {
      throw error;
    }

    return fetchCards(client);
  },

  async saveCard(card: Card, seedCards: Card[]) {
    const client = await getClient();

    if (!client) {
      return null;
    }

    await CardSupabaseRepository.seedCardsIfEmpty(seedCards);

    const row = await cardToRow(card, client);

    console.log("Life Cards Supabase card upsert payload", {
      id: row.id,
      imageFitMode: card.imageFitMode,
      image_fit_mode: row.image_fit_mode,
    });

    const { error } = await client.supabase
      .from("cards")
      .upsert(row, {
        onConflict: "user_id,id",
      });

    if (error) {
      throw error;
    }

    await persistImageFitMode(client, row.id, row.image_fit_mode);

    console.log("Life Cards Supabase card image_fit_mode saved", {
      id: row.id,
      image_fit_mode: await verifyImageFitMode(client, row.id),
    });

    return fetchCards(client);
  },

  async updateCard(card: Card, seedCards: Card[]) {
    return CardSupabaseRepository.saveCard(card, seedCards);
  },

  async deleteCard(cardId: string, seedCards: Card[]) {
    const client = await getClient();

    if (!client) {
      return null;
    }

    await CardSupabaseRepository.seedCardsIfEmpty(seedCards);

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

  async moveCardsToDeck(fromDeckId: string, toDeckId: string, seedCards: Card[]) {
    const client = await getClient();

    if (!client) {
      return null;
    }

    await CardSupabaseRepository.seedCardsIfEmpty(seedCards);

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
