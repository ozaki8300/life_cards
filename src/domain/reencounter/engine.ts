import type { Card } from "@/lib/types";

import type { ReencounterPickInput, ReencounterPickOptions } from "./types";
import { calculateReencounterScore } from "./score";

const DEFAULT_REENCOUNTER_LIMIT = 4;

function pick(
  input: ReencounterPickInput,
  options: ReencounterPickOptions = {},
): Card[] {
  const limit = options.limit ?? DEFAULT_REENCOUNTER_LIMIT;

  return input.cards
    .map((card, index) => ({
      card,
      index,
      score: calculateReencounterScore({
        metadata: input.metadataByCardId?.[card.id],
        isFavorite: input.favoriteIds.has(card.id),
        today: input.today,
      }),
    }))
    .sort((a, b) => {
      const scoreCompare = b.score - a.score;

      return scoreCompare === 0 ? a.index - b.index : scoreCompare;
    })
    .slice(0, limit)
    .map(({ card }) => card);
}

export const ReencounterEngine = {
  pick,
};
