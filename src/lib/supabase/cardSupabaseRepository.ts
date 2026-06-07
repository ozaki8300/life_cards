"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Card } from "@/lib/types";

type SupabaseCardRow = {
  back_text: string | null;
  created_at: string;
  deck_id: string;
  front_comment: string | null;
  front_text: string | null;
  id: string;
  is_favorite: boolean;
  updated_at: string;
};

function rowToCard(row: SupabaseCardRow): Card {
  return {
    backText: row.back_text ?? "",
    createdAt: row.created_at,
    deckId: row.deck_id,
    frontComment: row.front_comment ?? "",
    frontText: row.front_text ?? "",
    id: row.id,
    imagePath: "",
    isFavorite: row.is_favorite,
    updatedAt: row.updated_at,
  };
}

function cardToRow(card: Card, userId: string) {
  return {
    back_text: card.backText ?? "",
    created_at: card.createdAt,
    deck_id: card.deckId,
    front_comment: card.frontComment ?? "",
    front_text: card.frontText ?? "",
    id: card.id,
    image_path: "",
    is_favorite: Boolean(card.isFavorite),
    updated_at: card.updatedAt,
    user_id: userId,
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

async function fetchCards(
  client: NonNullable<Awaited<ReturnType<typeof getClient>>>,
) {
  const { data, error } = await client.supabase
    .from("cards")
    .select(
      "id,deck_id,front_text,front_comment,back_text,is_favorite,created_at,updated_at",
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

    const rows = seedCards.map((card) => cardToRow(card, client.userId));

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

    const { error } = await client.supabase
      .from("cards")
      .upsert(cardToRow(card, client.userId), {
        onConflict: "user_id,id",
      });

    if (error) {
      throw error;
    }

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

    const { error } = await client.supabase
      .from("cards")
      .delete()
      .eq("user_id", client.userId)
      .eq("id", cardId);

    if (error) {
      throw error;
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
