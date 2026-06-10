"use client";

import { useEffect, useState } from "react";

const COPY_FOR_AI_STORAGE_KEY = "life_cards.feature.copy_for_ai";

function parseBooleanFlag(value: string | undefined | null) {
  const normalized = value?.trim().toLowerCase();

  if (!normalized) {
    return null;
  }

  if (["1", "true", "on", "yes", "enabled"].includes(normalized)) {
    return true;
  }

  if (["0", "false", "off", "no", "disabled"].includes(normalized)) {
    return false;
  }

  return null;
}

function canUseStorage() {
  return (
    typeof window !== "undefined" && typeof window.localStorage !== "undefined"
  );
}

export const ENABLE_COPY_FOR_AI =
  parseBooleanFlag(process.env.NEXT_PUBLIC_ENABLE_COPY_FOR_AI) ?? false;

export const COPY_FOR_AI_LOCAL_STORAGE_KEY = COPY_FOR_AI_STORAGE_KEY;

export function getCopyForAiLocalOverride() {
  if (!canUseStorage()) {
    return null;
  }

  try {
    return parseBooleanFlag(
      window.localStorage.getItem(COPY_FOR_AI_STORAGE_KEY),
    );
  } catch {
    return null;
  }
}

export function resolveCopyForAiFeatureFlag(localOverride: boolean | null) {
  return localOverride ?? ENABLE_COPY_FOR_AI;
}

export function isCopyForAiEnabled() {
  return resolveCopyForAiFeatureFlag(getCopyForAiLocalOverride());
}

export function useCopyForAiFeatureFlag() {
  const [isEnabled, setIsEnabled] = useState(false);

  useEffect(() => {
    function syncFlag() {
      setIsEnabled(isCopyForAiEnabled());
    }

    function handleStorage(event: StorageEvent) {
      if (event.key === COPY_FOR_AI_LOCAL_STORAGE_KEY) {
        syncFlag();
      }
    }

    syncFlag();
    window.addEventListener("focus", syncFlag);
    window.addEventListener("pageshow", syncFlag);
    window.addEventListener("storage", handleStorage);
    document.addEventListener("visibilitychange", syncFlag);

    const intervalId = window.setInterval(syncFlag, 1000);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", syncFlag);
      window.removeEventListener("pageshow", syncFlag);
      window.removeEventListener("storage", handleStorage);
      document.removeEventListener("visibilitychange", syncFlag);
    };
  }, []);

  return isEnabled;
}
