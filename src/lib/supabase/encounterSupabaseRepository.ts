"use client";

import type { EncounterMetadata } from "@/domain/reencounter/types";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

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

const encounterSelectColumns =
  "card_id,first_viewed_at,last_viewed_at,view_count,last_reencounter_at,next_reencounter_at,updated_at";

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
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    console.warn("Life Cards Supabase encounter user lookup failed", {
      error: supabaseErrorLog(error),
    });
    throw error;
  }

  return user?.id ? { supabase, userId: user.id } : null;
}

async function fetchMetadataMap(
  client: NonNullable<Awaited<ReturnType<typeof getClient>>>,
) {
  const { data, error } = await client.supabase
    .from("encounters")
    .select(encounterSelectColumns)
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

  async getMetadata(cardId: string) {
    const client = await getClient();

    if (!client) {
      return null;
    }

    const { data, error } = await client.supabase
      .from("encounters")
      .select(encounterSelectColumns)
      .eq("user_id", client.userId)
      .eq("card_id", cardId)
      .maybeSingle<SupabaseEncounterRow>();

    if (error) {
      console.warn("Life Cards Supabase encounter lookup failed", {
        cardId,
        error: supabaseErrorLog(error),
        userId: client.userId,
      });
      throw error;
    }

    return data ? rowToMetadata(data) : null;
  },

  async saveMetadata(metadata: EncounterMetadata) {
    const client = await getClient();

    if (!client) {
      return null;
    }

    const row = metadataToRow(metadata, client.userId);
    const { data: existingEncounter, error: existingEncounterError } =
      await client.supabase
        .from("encounters")
        .select("card_id")
        .eq("user_id", client.userId)
        .eq("card_id", metadata.cardId)
        .maybeSingle<Pick<SupabaseEncounterRow, "card_id">>();

    if (existingEncounterError) {
      console.warn("Life Cards Supabase encounter lookup before save failed", {
        cardId: metadata.cardId,
        error: supabaseErrorLog(existingEncounterError),
        userId: client.userId,
      });
      throw existingEncounterError;
    }

    const { error } = existingEncounter
      ? await client.supabase
          .from("encounters")
          .update(row)
          .eq("user_id", client.userId)
          .eq("card_id", metadata.cardId)
      : await client.supabase.from("encounters").insert(row);

    if (error) {
      console.warn("Life Cards Supabase encounter upsert error", {
        cardId: metadata.cardId,
        error: supabaseErrorLog(error),
        userId: client.userId,
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
