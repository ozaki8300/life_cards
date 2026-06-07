import type { ReencounterScheduleInput } from "./types";

const DEFAULT_REENCOUNTER_INTERVAL_DAYS = 3;

export function getNextReencounterAt({
  viewedAt,
  intervalDays = DEFAULT_REENCOUNTER_INTERVAL_DAYS,
}: ReencounterScheduleInput) {
  const viewedAtDate = new Date(viewedAt);

  if (Number.isNaN(viewedAtDate.getTime())) {
    return viewedAt;
  }

  viewedAtDate.setUTCDate(viewedAtDate.getUTCDate() + intervalDays);

  return viewedAtDate.toISOString();
}
