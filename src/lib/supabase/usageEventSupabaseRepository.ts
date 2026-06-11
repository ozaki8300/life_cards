"use client";

import {
  createSupabaseBrowserClient,
  getSupabaseSessionSafely,
} from "@/lib/supabase/client";

export type UsageEventName =
  | "app_opened"
  | "card_created"
  | "copy_for_ai_used"
  | "reencounter_opened"
  | "share_created";

type UsageEventMetadata = Record<string, unknown>;

type UsageEventInsertRow = {
  event_name: UsageEventName;
  metadata: UsageEventMetadata;
  user_id: string;
};

async function getClient() {
  const supabase = createSupabaseBrowserClient();
  const session = await getSupabaseSessionSafely(supabase);
  const userId = session?.user.id;

  return userId ? { supabase, userId } : null;
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
      throw error;
    }

    return true;
  },

  async getCurrentUserId() {
    return (await getClient())?.userId ?? null;
  },
};
