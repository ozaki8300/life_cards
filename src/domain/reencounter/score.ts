import type { ReencounterScoreInput } from "./types";

const UNVIEWED_CARD_SCORE = 100;
const FAVORITE_CARD_BONUS = 20;
const REENCOUNTERED_TODAY_PENALTY = 1000;
const FUTURE_REENCOUNTER_PENALTY = 500;

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
      : UNVIEWED_CARD_SCORE;

  if (isFavorite) {
    score += FAVORITE_CARD_BONUS;
  }

  if (today && lastReencounterDate === today) {
    score -= REENCOUNTERED_TODAY_PENALTY;
  }

  if (today && nextReencounterDate && isAfterDate(nextReencounterDate, today)) {
    score -= FUTURE_REENCOUNTER_PENALTY;
  }

  return score;
}
