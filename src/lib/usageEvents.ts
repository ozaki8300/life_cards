"use client";

import {
  UsageEventSupabaseRepository,
  type UsageEventName,
} from "@/lib/supabase/usageEventSupabaseRepository";

const appOpenedStorageKeyPrefix = "life_cards.usage_events.app_opened";
const dedupWindowMs = 30 * 1000;
const dedupTargetEvents = new Set<UsageEventName>([
  "card_viewed",
  "reencounter_opened",
]);
const recentUsageEventsByKey = new Map<string, number>();

type UsageEventMetadata = Record<string, unknown>;

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function appOpenedStorageKey(userId: string) {
  return `${appOpenedStorageKeyPrefix}.${userId}`;
}

function metadataCardId(metadata: UsageEventMetadata) {
  const cardId = metadata.cardId ?? metadata.card_id;

  return typeof cardId === "string" && cardId.trim() ? cardId.trim() : null;
}

function shouldSkipDuplicateUsageEvent(
  eventName: UsageEventName,
  metadata: UsageEventMetadata,
) {
  if (!dedupTargetEvents.has(eventName)) {
    return false;
  }

  const cardId = metadataCardId(metadata);

  if (!cardId) {
    return false;
  }

  const now = Date.now();
  const dedupKey = `${eventName}:${cardId}`;
  const lastRecordedAt = recentUsageEventsByKey.get(dedupKey);

  if (lastRecordedAt && now - lastRecordedAt < dedupWindowMs) {
    return true;
  }

  recentUsageEventsByKey.set(dedupKey, now);

  for (const [key, recordedAt] of recentUsageEventsByKey) {
    if (now - recordedAt >= dedupWindowMs) {
      recentUsageEventsByKey.delete(key);
    }
  }

  return false;
}

export async function recordUsageEvent(
  eventName: UsageEventName,
  metadata: UsageEventMetadata = {},
) {
  if (shouldSkipDuplicateUsageEvent(eventName, metadata)) {
    return;
  }

  try {
    await UsageEventSupabaseRepository.recordEvent(eventName, metadata);
  } catch (error) {
    console.warn("Life Cards usage event record failed", {
      error,
      eventName,
    });
    // Usage events must never block the core Life Cards experience.
  }
}

export async function recordDailyAppOpened() {
  try {
    const userId = await UsageEventSupabaseRepository.getCurrentUserId();

    if (!userId || !canUseStorage()) {
      return;
    }

    const key = appOpenedStorageKey(userId);
    const today = todayKey();

    if (window.localStorage.getItem(key) === today) {
      return;
    }

    const recorded = await UsageEventSupabaseRepository.recordEvent(
      "app_opened",
      {
        source: "cards",
      },
    );

    if (recorded) {
      window.localStorage.setItem(key, today);
    }
  } catch (error) {
    console.warn("Life Cards app-open usage event failed", error);
    // App-open tracking is best-effort only.
  }
}
