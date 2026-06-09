import type { EncounterMetadata } from "@/domain/reencounter/types";
import { getNextReencounterAt } from "@/domain/reencounter/schedule";
import { EncounterSupabaseRepository } from "@/lib/supabase/encounterSupabaseRepository";

import { STORAGE_KEYS } from "./storageKeys";

type EncounterMetadataMap = Record<string, EncounterMetadata>;

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isEncounterMetadata(value: unknown): value is EncounterMetadata {
  return (
    isRecord(value) &&
    typeof value.cardId === "string" &&
    typeof value.viewCount === "number"
  );
}

function readStoredMetadataMap(): EncounterMetadataMap {
  if (!canUseStorage()) {
    return {};
  }

  const storedValue = window.localStorage.getItem(STORAGE_KEYS.encounters);

  if (!storedValue) {
    return {};
  }

  try {
    const parsedValue = JSON.parse(storedValue);

    if (!isRecord(parsedValue)) {
      return {};
    }

    return Object.entries(parsedValue).reduce<EncounterMetadataMap>(
      (metadataMap, [cardId, value]) => {
        if (isEncounterMetadata(value)) {
          metadataMap[cardId] = value;
        }

        return metadataMap;
      },
      {},
    );
  } catch (error) {
    console.warn("Life Cards encounters storage parse failed", error);
    return {};
  }
}

function writeStoredMetadataMap(metadataByCardId: EncounterMetadataMap) {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(
    STORAGE_KEYS.encounters,
    JSON.stringify(metadataByCardId),
  );
}

function recordViewInMap(
  metadataByCardId: EncounterMetadataMap,
  cardId: string,
  viewedAt: string,
) {
  const current = metadataByCardId[cardId];
  const nextMetadata: EncounterMetadata = {
    ...current,
    cardId,
    firstViewedAt: current?.firstViewedAt ?? viewedAt,
    lastViewedAt: viewedAt,
    viewCount: (current?.viewCount ?? 0) + 1,
  };

  return {
    metadata: nextMetadata,
    metadataByCardId: {
      ...metadataByCardId,
      [cardId]: nextMetadata,
    },
  };
}

export const EncounterRepository = {
  getMetadataMap() {
    return readStoredMetadataMap();
  },

  async getMetadataMapForCurrentUser() {
    try {
      return (
        (await EncounterSupabaseRepository.getMetadataMap()) ??
        EncounterRepository.getMetadataMap()
      );
    } catch (error) {
      console.warn("Life Cards Supabase encounters fetch failed", error);
      return EncounterRepository.getMetadataMap();
    }
  },

  getMetadata(cardId: string) {
    return readStoredMetadataMap()[cardId];
  },

  recordView(cardId: string, viewedAt: string) {
    const currentMap = readStoredMetadataMap();
    const { metadata, metadataByCardId } = recordViewInMap(
      currentMap,
      cardId,
      viewedAt,
    );

    writeStoredMetadataMap(metadataByCardId);
    return metadata;
  },

  async recordViewForCurrentUser(cardId: string, viewedAt: string) {
    const metadata = EncounterRepository.recordView(cardId, viewedAt);

    try {
      return (
        (await EncounterSupabaseRepository.saveMetadata(metadata)) ??
        EncounterRepository.getMetadataMap()
      );
    } catch (error) {
      console.warn("Life Cards Supabase encounter view save failed", error);
      return EncounterRepository.getMetadataMap();
    }
  },

  recordReencounter(cardId: string, viewedAt: string) {
    const currentMap = readStoredMetadataMap();
    const { metadata, metadataByCardId } = recordViewInMap(
      currentMap,
      cardId,
      viewedAt,
    );
    const nextMetadata: EncounterMetadata = {
      ...metadata,
      lastReencounterAt: viewedAt,
      nextReencounterAt: getNextReencounterAt({ viewedAt }),
    };

    writeStoredMetadataMap({
      ...metadataByCardId,
      [cardId]: nextMetadata,
    });

    return nextMetadata;
  },

  async recordReencounterForCurrentUser(cardId: string, viewedAt: string) {
    const metadata = EncounterRepository.recordReencounter(cardId, viewedAt);

    try {
      return (
        (await EncounterSupabaseRepository.saveMetadata(metadata)) ??
        EncounterRepository.getMetadataMap()
      );
    } catch (error) {
      console.warn(
        "Life Cards Supabase encounter reencounter save failed",
        error,
      );
      return EncounterRepository.getMetadataMap();
    }
  },

  deleteMetadata(cardId: string) {
    const currentMap = readStoredMetadataMap();

    if (!(cardId in currentMap)) {
      return currentMap;
    }

    const { [cardId]: _deletedMetadata, ...nextMap } = currentMap;
    void _deletedMetadata;

    writeStoredMetadataMap(nextMap);
    return nextMap;
  },

  async deleteMetadataForCurrentUser(cardId: string) {
    const nextMap = EncounterRepository.deleteMetadata(cardId);

    try {
      return (
        (await EncounterSupabaseRepository.deleteMetadata(cardId)) ?? nextMap
      );
    } catch (error) {
      console.warn("Life Cards Supabase encounter delete failed", error);
      return nextMap;
    }
  },
};
