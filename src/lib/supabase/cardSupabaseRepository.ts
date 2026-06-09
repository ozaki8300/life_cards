"use client";

import { CardSaveError } from "@/lib/cardSaveErrors";
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
      console.warn("Life Cards Supabase image resolve upload start", {
        cardId: card.id,
        imagePathKind: imagePathKind(imagePath),
      });

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
  const imagePath = (card.imagePath ?? "").trim();
  const imageStoragePath = (card.imageStoragePath ?? "").trim();
  const resolvedImagePath = await resolveImagePathForSave(card, client);

  console.warn("Life Cards Supabase card row prepared", {
    cardId: card.id,
    imagePathKind: imagePathKind(imagePath),
    imageStoragePathKind: imagePathKind(imageStoragePath),
    resolvedImagePathKind: imagePathKind(resolvedImagePath),
    resolvedImagePath,
  });

  return {
    back_text: card.backText ?? "",
    created_at: card.createdAt,
    deck_id: card.deckId,
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
}

async function persistImageFitMode(
  client: NonNullable<Awaited<ReturnType<typeof getClient>>>,
  cardId: string,
  imageFitMode: CardImageFitMode,
) {
  console.warn("Life Cards Supabase image_fit_mode persist start", {
    cardId,
    imageFitMode,
    userId: client.userId,
  });

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

  console.warn("Life Cards Supabase image_fit_mode persist success", {
    cardId,
    imageFitMode,
    userId: client.userId,
  });
}

async function verifyImageFitMode(
  client: NonNullable<Awaited<ReturnType<typeof getClient>>>,
  cardId: string,
) {
  console.warn("Life Cards Supabase image_fit_mode verify start", {
    cardId,
    userId: client.userId,
  });

  const { data, error } = await client.supabase
    .from("cards")
    .select("image_fit_mode")
    .eq("user_id", client.userId)
    .eq("id", cardId)
    .maybeSingle();

  if (error) {
    console.warn("Life Cards Supabase image_fit_mode verify error", {
      cardId,
      error: supabaseErrorLog(error),
      userId: client.userId,
    });
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

  console.warn("Life Cards Supabase card client session", {
    hasSession: Boolean(session),
    hasUserId: Boolean(userId),
  });

  return userId ? { supabase, userId } : null;
}

async function fetchCards(
  client: NonNullable<Awaited<ReturnType<typeof getClient>>>,
) {
  console.warn("Life Cards Supabase cards fetch start", {
    userId: client.userId,
  });

  const { data, error } = await client.supabase
    .from("cards")
    .select(
      "id,deck_id,front_text,front_comment,back_text,image_path,image_fit_mode,is_favorite,link_url,created_at,updated_at",
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

  console.warn("Life Cards Supabase cards fetch success", {
    count: data?.length ?? 0,
    userId: client.userId,
  });

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
      console.warn("Life Cards Supabase seed cards skipped", {
        reason: "missing-session",
        seedCount: seedCards.length,
      });
      return null;
    }

    console.warn("Life Cards Supabase seed cards check start", {
      seedCount: seedCards.length,
      userId: client.userId,
    });

    const currentCards = await fetchCards(client);

    if (currentCards.length > 0) {
      console.warn("Life Cards Supabase seed cards skipped", {
        currentCount: currentCards.length,
        reason: "already-has-cards",
        userId: client.userId,
      });
      return currentCards;
    }

    const rows = await Promise.all(
      seedCards.map((card) => cardToRow(card, client)),
    );

    if (rows.length === 0) {
      console.warn("Life Cards Supabase seed cards empty", {
        userId: client.userId,
      });
      return [];
    }

    console.warn("Life Cards Supabase seed cards upsert start", {
      rowCount: rows.length,
      userId: client.userId,
    });

    const { error } = await client.supabase
      .from("cards")
      .upsert(rows, { onConflict: "user_id,id" });

    if (error) {
      console.warn("Life Cards Supabase seed cards upsert error", {
        error: supabaseErrorLog(error),
        rowCount: rows.length,
        userId: client.userId,
      });
      throw error;
    }

    console.warn("Life Cards Supabase seed cards upsert success", {
      rowCount: rows.length,
      userId: client.userId,
    });

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
      image_path: row.image_path,
      image_path_kind: imagePathKind(row.image_path),
      user_id: row.user_id,
    });

    console.warn("Life Cards Supabase card upsert start", {
      cardId: row.id,
      imagePathKind: imagePathKind(row.image_path),
      userId: client.userId,
    });

    const { error } = await client.supabase
      .from("cards")
      .upsert(row, {
        onConflict: "user_id,id",
      });

    if (error) {
      console.warn("Life Cards Supabase card upsert error", {
        cardId: row.id,
        error: supabaseErrorLog(error),
        imagePathKind: imagePathKind(row.image_path),
        userId: client.userId,
      });
      throw error;
    }

    console.warn("Life Cards Supabase card upsert success", {
      cardId: row.id,
      imagePathKind: imagePathKind(row.image_path),
      userId: client.userId,
    });

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
