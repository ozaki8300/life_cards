import type { ReencounterScoreInput } from "./types";

export const REENCOUNTER_SCORE_V1 = {
  favoriteBonus: 20,
  futureReencounterPenalty: 500,
  reencounteredTodayPenalty: 1000,
  unviewedCardScore: 100,
} as const;

function datePart(value: string) {
  return value.slice(0, 10);
}

function daysBetween(startDate: string, endDate: string) {
  const startTime = new Date(`${startDate}T00:00:00.000Z`).getTime();
  const endTime = new Date(`${endDate}T00:00:00.000Z`).getTime();

  if (Number.isNaN(startTime) || Number.isNaN(endTime)) {
    return 0;
  }

  return Math.max(0, Math.floor((endTime - startTime) / 86_400_000));
}

function isAfterDate(date: string, comparisonDate: string) {
  const dateTime = new Date(`${date}T00:00:00.000Z`).getTime();
  const comparisonTime = new Date(`${comparisonDate}T00:00:00.000Z`).getTime();

  if (Number.isNaN(dateTime) || Number.isNaN(comparisonTime)) {
    return false;
  }

  return dateTime > comparisonTime;
}

export function calculateReencounterScore({
  metadata,
  isFavorite,
  today,
}: ReencounterScoreInput) {
  const lastViewedDate = metadata?.lastViewedAt
    ? datePart(metadata.lastViewedAt)
    : null;
  const lastReencounterDate = metadata?.lastReencounterAt
    ? datePart(metadata.lastReencounterAt)
    : null;
  const nextReencounterDate = metadata?.nextReencounterAt
    ? datePart(metadata.nextReencounterAt)
    : null;
  let score =
    lastViewedDate && today
      ? daysBetween(lastViewedDate, today)
      : REENCOUNTER_SCORE_V1.unviewedCardScore;

  if (isFavorite) {
    score += REENCOUNTER_SCORE_V1.favoriteBonus;
  }

  if (today && lastReencounterDate === today) {
    score -= REENCOUNTER_SCORE_V1.reencounteredTodayPenalty;
  }

  if (today && nextReencounterDate && isAfterDate(nextReencounterDate, today)) {
    score -= REENCOUNTER_SCORE_V1.futureReencounterPenalty;
  }

  return score;
}
