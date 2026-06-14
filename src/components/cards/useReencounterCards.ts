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
  const favoriteSignature = Array.from(favoriteIds).sort().join("|");
  const selectionKey = useMemo(
    () => `${today}:${favoriteSignature}:${cards.map((card) => card.id).join("|")}`,
    [cards, favoriteSignature, today],
  );

  return useMemo(
    () =>
      pickReencounterCards({
        cards,
        favoriteIds,
        metadataByCardId,
        today,
      }),
    // Keep today's picks stable while encounter metadata changes during viewing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectionKey],
  );
}
