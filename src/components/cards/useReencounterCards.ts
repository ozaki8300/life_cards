"use client";

import { useMemo } from "react";

import type { EncounterMetadata } from "@/domain/reencounter/types";
import type { Card } from "@/lib/types";

import { pickReencounterCards } from "./cardHomeUtils";

type Params = {
  cards: Card[];
  favoriteIds: ReadonlySet<string>;
  metadataByCardId: Record<string, EncounterMetadata>;
};

export default function useReencounterCards({
  cards,
  favoriteIds,
  metadataByCardId,
}: Params) {
  const today = new Date().toISOString().slice(0, 10);

  return useMemo(
    () =>
      pickReencounterCards({
        cards,
        favoriteIds,
        metadataByCardId,
        today,
      }),
    [cards, favoriteIds, metadataByCardId, today],
  );
}
