"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export type UsageEventName =
  | "app_opened"
  | "card_created"
  | "card_viewed"
  | "copy_for_ai_used"
  | "login"
  | "reencounter_opened"
  | "share_created";

type UsageEventMetadata = Record<string, unknown>;

type UsageEventInsertRow = {
  event_name: UsageEventName;
  metadata: UsageEventMetadata;
  user_id: string;
};

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

function usageEventInsertHint(error: unknown) {
  if (!error || typeof error !== "object") {
    return "Unknown usage_events insert error.";
  }

  const code = (error as Record<string, unknown>).code;

  if (code === "42501") {
    return "Check usage_events RLS and usage_events_insert_own policy: with check (user_id = auth.uid()).";
  }

  if (code === "42P01") {
    return "Check that public.usage_events exists in the connected Supabase project.";
  }

  if (code === "42703") {
    return "Check usage_events columns: user_id, event_name, metadata, created_at.";
  }

  if (code === "23503") {
    return "Check usage_events.user_id references an existing auth.users id.";
  }

  return "Check usage_events schema, RLS, and insert policy in the connected Supabase project.";
}

async function getClient() {
  const supabase = createSupabaseBrowserClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    console.warn("Life Cards usage event user lookup failed", {
      error: supabaseErrorLog(error),
    });
    throw error;
  }

  return user?.id ? { supabase, userId: user.id } : null;
}

export const UsageEventSupabaseRepository = {
  async recordEvent(
    eventName: UsageEventName,
    metadata: UsageEventMetadata = {},
  ) {
    console.warn("Life Cards usage event repository start", {
      eventName,
      metadataKeys: Object.keys(metadata),
    });

    const client = await getClient();

    if (!client) {
      console.warn("Life Cards usage event repository skipped", {
        eventName,
        reason: "missing-user",
      });
      return false;
    }

    console.warn("Life Cards usage event repository user", {
      eventName,
      userId: client.userId,
    });

    const row: UsageEventInsertRow = {
      event_name: eventName,
      metadata,
      user_id: client.userId,
    };

    const { error } = await client.supabase.from("usage_events").insert(row);

    if (error) {
      console.warn("Life Cards usage event insert failed", {
        error: supabaseErrorLog(error),
        eventName,
        hint: usageEventInsertHint(error),
        metadataKeys: Object.keys(metadata),
        row,
        userId: client.userId,
      });
      throw error;
    }

    console.warn("Life Cards usage event insert success", {
      eventName,
      userId: client.userId,
    });

    return true;
  },

  async getCurrentUserId() {
    return (await getClient())?.userId ?? null;
  },
};
