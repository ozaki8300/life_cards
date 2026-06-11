"use client";

import type { EncounterMetadata } from "@/domain/reencounter/types";
import {
  createSupabaseBrowserClient,
  getSupabaseSessionSafely,
} from "@/lib/supabase/client";

type EncounterMetadataMap = Record<string, EncounterMetadata>;

type SupabaseEncounterRow = {
  card_id: string;
  first_viewed_at: string | null;
  last_reencounter_at: string | null;
  last_viewed_at: string | null;
  next_reencounter_at: string | null;
  updated_at: string;
  view_count: number;
};

function rowToMetadata(row: SupabaseEncounterRow): EncounterMetadata {
  return {
    cardId: row.card_id,
    firstViewedAt: row.first_viewed_at ?? undefined,
    lastReencounterAt: row.last_reencounter_at ?? undefined,
    lastViewedAt: row.last_viewed_at ?? undefined,
    nextReencounterAt: row.next_reencounter_at ?? undefined,
    viewCount: row.view_count,
  };
}

function metadataToRow(metadata: EncounterMetadata, userId: string) {
  return {
    card_id: metadata.cardId,
    first_viewed_at: metadata.firstViewedAt ?? null,
    last_reencounter_at: metadata.lastReencounterAt ?? null,
    last_viewed_at: metadata.lastViewedAt ?? null,
    next_reencounter_at: metadata.nextReencounterAt ?? null,
    updated_at: new Date().toISOString(),
    user_id: userId,
    view_count: metadata.viewCount,
  };
}

function rowsToMetadataMap(rows: SupabaseEncounterRow[]): EncounterMetadataMap {
  return rows.reduce<EncounterMetadataMap>((metadataMap, row) => {
    const metadata = rowToMetadata(row);
    metadataMap[metadata.cardId] = metadata;
    return metadataMap;
  }, {});
}

async function getClient() {
  const supabase = createSupabaseBrowserClient();
  const session = await getSupabaseSessionSafely(supabase);
  const userId = session?.user.id;

  return userId ? { supabase, userId } : null;
}

async function fetchMetadataMap(
  client: NonNullable<Awaited<ReturnType<typeof getClient>>>,
) {
  const { data, error } = await client.supabase
    .from("encounters")
    .select(
      "card_id,first_viewed_at,last_viewed_at,view_count,last_reencounter_at,next_reencounter_at,updated_at",
    )
    .order("updated_at", { ascending: false });

  if (error) {
    throw error;
  }

  return rowsToMetadataMap((data ?? []) as SupabaseEncounterRow[]);
}

export const EncounterSupabaseRepository = {
  async getMetadataMap() {
    const client = await getClient();

    return client ? fetchMetadataMap(client) : null;
  },

  async saveMetadata(metadata: EncounterMetadata) {
    const client = await getClient();

    if (!client) {
      return null;
    }

    const row = metadataToRow(metadata, client.userId);

    const { error } = await client.supabase
      .from("encounters")
      .upsert(row, {
        onConflict: "user_id,card_id",
      });

    if (error) {
      console.warn("Life Cards Supabase encounter upsert error", {
        error,
        row,
      });
      throw error;
    }

    return fetchMetadataMap(client);
  },

  async deleteMetadata(cardId: string) {
    const client = await getClient();

    if (!client) {
      return null;
    }

    const { error } = await client.supabase
      .from("encounters")
      .delete()
      .eq("user_id", client.userId)
      .eq("card_id", cardId);

    if (error) {
      throw error;
    }

    return fetchMetadataMap(client);
  },
};
