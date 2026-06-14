import type { ReencounterScoreInput, ReencounterScoreResult } from "./types";

export const REENCOUNTER_SCORE_V1 = {
  favoriteBonus: 100,
  lowViewBonusByViewCount: {
    none: 30,
    once: 20,
    twice: 10,
  },
  randomBonusMax: 5,
  unviewedCardScore: 30,
} as const;

function datePart(value: string) {
  return value.slice(0, 10);
}

function todayDatePart() {
  return datePart(new Date().toISOString());
}

function daysBetween(startDate: string, endDate: string) {
  const startTime = new Date(`${startDate}T00:00:00.000Z`).getTime();
  const endTime = new Date(`${endDate}T00:00:00.000Z`).getTime();

  if (Number.isNaN(startTime) || Number.isNaN(endTime)) {
    return 0;
  }

  return Math.max(0, Math.floor((endTime - startTime) / 86_400_000));
}

function lowViewBonusFor(viewCount: number) {
  if (viewCount <= 0) {
    return REENCOUNTER_SCORE_V1.lowViewBonusByViewCount.none;
  }

  if (viewCount === 1) {
    return REENCOUNTER_SCORE_V1.lowViewBonusByViewCount.once;
  }

  if (viewCount === 2) {
    return REENCOUNTER_SCORE_V1.lowViewBonusByViewCount.twice;
  }

  return 0;
}

function reasonFor({
  daysSinceLastViewed,
  hasLastViewed,
  isFavorite,
  viewCount,
}: {
  daysSinceLastViewed: number;
  hasLastViewed: boolean;
  isFavorite: boolean;
  viewCount: number;
}) {
  if (!hasLastViewed) {
    return "まだ見ていないカード";
  }

  if (daysSinceLastViewed >= 1) {
    return `${daysSinceLastViewed}日ぶりの再会`;
  }

  if (isFavorite) {
    return "お気に入りカード";
  }

  if (viewCount <= 0) {
    return "まだ見ていないカード";
  }

  if (viewCount === 1) {
    return "まだ1回しか見ていません";
  }

  if (viewCount === 2) {
    return "まだ2回しか見ていません";
  }

  return "最近見ていなかったカード";
}

export function calculateReencounterScore({
  metadata,
  isFavorite,
  random = Math.random,
  today = todayDatePart(),
}: ReencounterScoreInput): ReencounterScoreResult {
  const viewCount = metadata?.viewCount ?? 0;
  const lastViewedDate = metadata?.lastViewedAt
    ? datePart(metadata.lastViewedAt)
    : null;
  const daysSinceLastViewed = lastViewedDate
    ? daysBetween(lastViewedDate, today)
    : REENCOUNTER_SCORE_V1.unviewedCardScore;
  const favoriteBonus = isFavorite ? REENCOUNTER_SCORE_V1.favoriteBonus : 0;
  const lowViewBonus = lowViewBonusFor(viewCount);
  const randomBonus =
    Math.max(0, Math.min(1, random())) * REENCOUNTER_SCORE_V1.randomBonusMax;
  const score =
    favoriteBonus + daysSinceLastViewed + lowViewBonus + randomBonus;

  return {
    randomBonus,
    reason: reasonFor({
      daysSinceLastViewed,
      hasLastViewed: Boolean(lastViewedDate),
      isFavorite,
      viewCount,
    }),
    score,
  };
}
