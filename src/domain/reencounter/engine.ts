import type {
  ReencounterCandidate,
  ReencounterPickInput,
  ReencounterPickOptions,
  ReencounterReasonType,
} from "./types";
import { calculateReencounterScore } from "./score";

const DEFAULT_REENCOUNTER_LIMIT = 3;
const MAX_CANDIDATES_PER_DECK = 2;
const MAX_FAVORITE_REASON_CANDIDATES = 2;

type ScoredReencounterCandidate = ReencounterCandidate & {
  index: number;
  randomBonus: number;
};

function compareCandidates(
  a: ScoredReencounterCandidate,
  b: ScoredReencounterCandidate,
) {
  const scoreCompare = b.score - a.score;

  if (scoreCompare !== 0) {
    return scoreCompare;
  }

  const randomCompare = b.randomBonus - a.randomBonus;

  return randomCompare === 0 ? a.index - b.index : randomCompare;
}

function withReasonType(
  candidate: ScoredReencounterCandidate,
  reasonType: ReencounterReasonType,
): ScoredReencounterCandidate {
  if (candidate.reasonType !== "random_discovery") {
    return candidate;
  }

  if (reasonType !== "deck_diversity") {
    return candidate;
  }

  return {
    ...candidate,
    reason: "最近見ていないDeckから選びました",
    reasonLabel: "Deck",
    reasonType,
  };
}

function selectWithDiversity(
  candidates: ScoredReencounterCandidate[],
  limit: number,
) {
  const selected: ScoredReencounterCandidate[] = [];
  const deferred: ScoredReencounterCandidate[] = [];
  const deckCounts = new Map<string, number>();
  let hasDeckDeferrals = false;
  let favoriteReasonCount = 0;

  for (const candidate of candidates) {
    if (selected.length >= limit) {
      break;
    }

    const deckCount = deckCounts.get(candidate.card.deckId) ?? 0;
    const exceedsDeckLimit = deckCount >= MAX_CANDIDATES_PER_DECK;
    const exceedsFavoriteReasonLimit =
      candidate.reasonType === "favorite" &&
      favoriteReasonCount >= MAX_FAVORITE_REASON_CANDIDATES;

    if (exceedsDeckLimit || exceedsFavoriteReasonLimit) {
      hasDeckDeferrals ||= exceedsDeckLimit;
      deferred.push(candidate);
      continue;
    }

    selected.push(
      withReasonType(
        candidate,
        hasDeckDeferrals ? "deck_diversity" : candidate.reasonType,
      ),
    );
    deckCounts.set(candidate.card.deckId, deckCount + 1);

    if (candidate.reasonType === "favorite") {
      favoriteReasonCount += 1;
    }
  }

  if (selected.length >= limit) {
    return selected;
  }

  const selectedIds = new Set(selected.map((candidate) => candidate.card.id));

  for (const candidate of deferred) {
    if (selected.length >= limit) {
      break;
    }

    if (selectedIds.has(candidate.card.id)) {
      continue;
    }

    selected.push(candidate);
    selectedIds.add(candidate.card.id);
  }

  return selected;
}

function pick(
  input: ReencounterPickInput,
  options: ReencounterPickOptions = {},
): ReencounterCandidate[] {
  const limit = options.limit ?? DEFAULT_REENCOUNTER_LIMIT;
  const random = options.random ?? Math.random;

  const scoredCandidates = input.cards
    .map((card, index) => {
      const scoreResult = calculateReencounterScore({
        card,
        metadata: input.metadataByCardId?.[card.id],
        isFavorite: input.favoriteIds.has(card.id) || Boolean(card.isFavorite),
        random,
        today: input.today,
      });

      return {
        card,
        index,
        randomBonus: scoreResult.randomBonus,
        reason: scoreResult.reason,
        reasonLabel: scoreResult.reasonLabel,
        reasonType: scoreResult.reasonType,
        score: scoreResult.score,
      };
    })
    .sort(compareCandidates);

  return selectWithDiversity(scoredCandidates, limit).map(
    ({ card, reason, reasonLabel, reasonType, score }) => ({
      card,
      reason,
      reasonLabel,
      reasonType,
      score,
    }),
  );
}

export const ReencounterEngine = {
  pick,
};
