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
    const client = await getClient();

    if (!client) {
      return false;
    }

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
        userId: client.userId,
      });
      throw error;
    }

    return true;
  },

  async getCurrentUserId() {
    return (await getClient())?.userId ?? null;
  },
};
