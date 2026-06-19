"use client";

import {
  createSupabaseBrowserClient,
  getSupabaseSessionSafely,
} from "@/lib/supabase/client";
import type { Deck } from "@/lib/types";

type SupabaseDeckRow = {
  created_at: string;
  id: string;
  is_shared: boolean;
  name: string;
  sort_order: number;
};

const uncategorizedDeck = {
  createdAt: "2026-06-06",
  id: "uncategorized",
  isShared: false,
  name: "未分類",
} satisfies Deck;

function rowToDeck(row: SupabaseDeckRow): Deck {
  return {
    createdAt: row.created_at,
    id: row.id,
    isShared: row.is_shared,
    name: row.name,
  };
}

async function ensureUncategorizedDeck(
  client: NonNullable<Awaited<ReturnType<typeof getClient>>>,
) {
  const { error } = await client.supabase
    .from("decks")
    .upsert(deckToRow(uncategorizedDeck, client.userId, 9999), {
      onConflict: "user_id,id",
    });

  if (error) {
    throw error;
  }
}

function deckToRow(deck: Deck, userId: string, sortOrder: number) {
  return {
    created_at: deck.createdAt,
    id: deck.id,
    is_shared: Boolean(deck.isShared),
    name: deck.name,
    sort_order: sortOrder,
    updated_at: new Date().toISOString(),
    user_id: userId,
  };
}

async function getClient() {
  const supabase = createSupabaseBrowserClient();
  const session = await getSupabaseSessionSafely(supabase);
  const userId = session?.user.id;

  return userId ? { supabase, userId } : null;
}

async function fetchDecks(
  client: NonNullable<Awaited<ReturnType<typeof getClient>>>,
) {
  const { data, error } = await client.supabase
    .from("decks")
    .select("id,name,is_shared,created_at,sort_order")
    .eq("user_id", client.userId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  return ((data ?? []) as SupabaseDeckRow[]).map(rowToDeck);
}

export const DeckSupabaseRepository = {
  async getDecks() {
    const client = await getClient();

    return client ? fetchDecks(client) : null;
  },

  async seedDecksIfEmpty() {
    const client = await getClient();

    if (!client) {
      return null;
    }

    const currentDecks = await fetchDecks(client);

    if (currentDecks.length > 0) {
      return currentDecks;
    }

    await ensureUncategorizedDeck(client);

    return fetchDecks(client);
  },

  async saveDeck(deck: Deck) {
    const client = await getClient();

    if (!client) {
      return null;
    }

    const currentDecks =
      (await DeckSupabaseRepository.seedDecksIfEmpty()) ?? [];
    const existingIndex = currentDecks.findIndex((item) => item.id === deck.id);
    const sortOrder = existingIndex >= 0 ? existingIndex : currentDecks.length;

    const { error } = await client.supabase
      .from("decks")
      .upsert(deckToRow(deck, client.userId, sortOrder), {
        onConflict: "user_id,id",
      });

    if (error) {
      throw error;
    }

    return fetchDecks(client);
  },

  async deleteDeck(deckId: string) {
    const client = await getClient();

    if (!client) {
      return null;
    }

    await DeckSupabaseRepository.seedDecksIfEmpty();

    const { error } = await client.supabase
      .from("decks")
      .delete()
      .eq("user_id", client.userId)
      .eq("id", deckId);

    if (error) {
      throw error;
    }

    return fetchDecks(client);
  },

  async reorderDecks(nextDecks: Deck[]) {
    const client = await getClient();

    if (!client) {
      return null;
    }

    const rows = nextDecks.map((deck, index) =>
      deckToRow(deck, client.userId, index),
    );

    const { error } = await client.supabase
      .from("decks")
      .upsert(rows, { onConflict: "user_id,id" });

    if (error) {
      throw error;
    }

    return fetchDecks(client);
  },
};
