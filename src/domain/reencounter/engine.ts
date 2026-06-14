import type {
  ReencounterCandidate,
  ReencounterPickInput,
  ReencounterPickOptions,
} from "./types";
import { calculateReencounterScore } from "./score";

const DEFAULT_REENCOUNTER_LIMIT = 3;

function pick(
  input: ReencounterPickInput,
  options: ReencounterPickOptions = {},
): ReencounterCandidate[] {
  const limit = options.limit ?? DEFAULT_REENCOUNTER_LIMIT;
  const random = options.random ?? Math.random;

  return input.cards
    .map((card, index) => {
      const scoreResult = calculateReencounterScore({
        metadata: input.metadataByCardId?.[card.id],
        isFavorite: input.favoriteIds.has(card.id),
        random,
        today: input.today,
      });

      return {
        card,
        index,
        randomBonus: scoreResult.randomBonus,
        reason: scoreResult.reason,
        score: scoreResult.score,
      };
    })
    .sort((a, b) => {
      const scoreCompare = b.score - a.score;

      if (scoreCompare !== 0) {
        return scoreCompare;
      }

      const randomCompare = b.randomBonus - a.randomBonus;

      return randomCompare === 0 ? a.index - b.index : randomCompare;
    })
    .slice(0, limit)
    .map(({ card, reason, score }) => ({ card, reason, score }));
}

export const ReencounterEngine = {
  pick,
};
