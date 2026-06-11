"use client";

import {
  UsageEventSupabaseRepository,
  type UsageEventName,
} from "@/lib/supabase/usageEventSupabaseRepository";

const appOpenedStorageKeyPrefix = "life_cards.usage_events.app_opened";

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

function warnUsageEventError(message: string, error: unknown) {
  console.warn(message, error);
}

export async function recordUsageEvent(
  eventName: UsageEventName,
  metadata: UsageEventMetadata = {},
) {
  console.warn("Life Cards usage event start", {
    eventName,
    metadataKeys: Object.keys(metadata),
  });

  try {
    const recorded = await UsageEventSupabaseRepository.recordEvent(
      eventName,
      metadata,
    );

    if (!recorded) {
      warnUsageEventError("Life Cards usage event skipped", {
        eventName,
        reason: "missing-session",
      });
    }
  } catch (error) {
    warnUsageEventError("Life Cards usage event record failed", {
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
    warnUsageEventError("Life Cards app-open usage event failed", error);
    // App-open tracking is best-effort only.
  }
}
