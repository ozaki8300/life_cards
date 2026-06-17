import type {
  ReencounterReasonType,
  ReencounterScoreInput,
  ReencounterScoreResult,
} from "./types";

export const REENCOUNTER_SCORE_V1 = {
  dueScheduleBonus: 10,
  favoriteBonus: 18,
  longAbsenceCapDays: 120,
  longAbsenceMaxBonus: 30,
  lowViewBonusByViewCount: {
    none: 18,
    onceOrTwice: 10,
  },
  overViewedPenalty: -6,
  randomBonusMax: 8,
  recentCreatedBonus: 14,
  recentReencounterPenaltyByDays: {
    oneOrTwo: -45,
    threeToSix: -18,
    today: -100,
  },
  recentUpdatedBonus: 8,
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

function daysSince(value: string | undefined, today: string) {
  return value ? daysBetween(datePart(value), today) : null;
}

function lowViewBonusFor(viewCount: number) {
  if (viewCount <= 0) {
    return REENCOUNTER_SCORE_V1.lowViewBonusByViewCount.none;
  }

  if (viewCount <= 2) {
    return REENCOUNTER_SCORE_V1.lowViewBonusByViewCount.onceOrTwice;
  }

  return 0;
}

function longAbsenceBonusFor(daysSinceLastViewed: number | null) {
  if (daysSinceLastViewed === null || daysSinceLastViewed < 7) {
    return 0;
  }

  const cappedDays = Math.min(
    daysSinceLastViewed,
    REENCOUNTER_SCORE_V1.longAbsenceCapDays,
  );

  return Math.round(
    (cappedDays / REENCOUNTER_SCORE_V1.longAbsenceCapDays) *
      REENCOUNTER_SCORE_V1.longAbsenceMaxBonus,
  );
}

function recentReencounterPenaltyFor(daysSinceLastReencounter: number | null) {
  if (daysSinceLastReencounter === null) {
    return 0;
  }

  if (daysSinceLastReencounter === 0) {
    return REENCOUNTER_SCORE_V1.recentReencounterPenaltyByDays.today;
  }

  if (daysSinceLastReencounter <= 2) {
    return REENCOUNTER_SCORE_V1.recentReencounterPenaltyByDays.oneOrTwo;
  }

  if (daysSinceLastReencounter <= 6) {
    return REENCOUNTER_SCORE_V1.recentReencounterPenaltyByDays.threeToSix;
  }

  return 0;
}

function recentActivityBonusFor({
  createdDays,
  updatedDays,
  wasUpdatedAfterCreate,
}: {
  createdDays: number | null;
  updatedDays: number | null;
  wasUpdatedAfterCreate: boolean;
}) {
  if (createdDays !== null && createdDays <= 2) {
    return {
      reason: "最近作ったカード",
      score: REENCOUNTER_SCORE_V1.recentCreatedBonus,
    };
  }

  if (wasUpdatedAfterCreate && updatedDays !== null && updatedDays <= 3) {
    return {
      reason: "最近更新したカード",
      score: REENCOUNTER_SCORE_V1.recentUpdatedBonus,
    };
  }

  return {
    reason: "最近作ったカード",
    score: 0,
  };
}

function dueScheduleBonusFor(
  nextReencounterAt: string | undefined,
  today: string,
) {
  if (!nextReencounterAt) {
    return 0;
  }

  return datePart(nextReencounterAt) <= today
    ? REENCOUNTER_SCORE_V1.dueScheduleBonus
    : 0;
}

function reasonTextFor({
  daysSinceLastViewed,
  recentActivityReason,
  reasonType,
}: {
  daysSinceLastViewed: number | null;
  recentActivityReason: string;
  reasonType: ReencounterReasonType;
}) {
  if (reasonType === "long_absence" && daysSinceLastViewed !== null) {
    return `${daysSinceLastViewed}日ぶりの再会`;
  }

  if (reasonType === "favorite") {
    return "お気に入りカード";
  }

  if (reasonType === "recent_activity") {
    return recentActivityReason;
  }

  if (reasonType === "low_view") {
    return "まだあまり見ていないカード";
  }

  if (reasonType === "deck_diversity") {
    return "最近見ていないDeckから選びました";
  }

  return "ランダム発見カード";
}

function reasonLabelFor(reasonType: ReencounterReasonType) {
  if (reasonType === "long_absence") {
    return "久しぶり";
  }

  if (reasonType === "favorite") {
    return "お気に入り";
  }

  if (reasonType === "recent_activity") {
    return "最近";
  }

  if (reasonType === "low_view") {
    return "未再読";
  }

  if (reasonType === "deck_diversity") {
    return "Deck";
  }

  return "発見";
}

function dominantReasonFor(
  contributions: Array<{
    priority: number;
    score: number;
    type: ReencounterReasonType;
  }>,
) {
  return [...contributions]
    .filter((contribution) => contribution.score > 0)
    .sort((a, b) => {
      const scoreCompare = b.score - a.score;

      return scoreCompare === 0 ? a.priority - b.priority : scoreCompare;
    })[0]?.type ?? "random_discovery";
}

export function calculateReencounterScore({
  card,
  metadata,
  isFavorite,
  random = Math.random,
  today,
}: ReencounterScoreInput): ReencounterScoreResult {
  const viewCount = metadata?.viewCount ?? 0;
  const daysSinceLastViewed = daysSince(metadata?.lastViewedAt, today);
  const daysSinceLastReencounter = daysSince(metadata?.lastReencounterAt, today);
  const createdDays = daysSince(card.createdAt, today);
  const updatedDays = daysSince(card.updatedAt, today);
  const wasUpdatedAfterCreate =
    datePart(card.updatedAt) !== datePart(card.createdAt);
  const longAbsenceBonus = longAbsenceBonusFor(daysSinceLastViewed);
  const favoriteBonus = isFavorite || card.isFavorite
    ? REENCOUNTER_SCORE_V1.favoriteBonus
    : 0;
  const lowViewBonus = lowViewBonusFor(viewCount);
  const recentActivity = recentActivityBonusFor({
    createdDays,
    updatedDays,
    wasUpdatedAfterCreate,
  });
  const dueScheduleBonus = dueScheduleBonusFor(
    metadata?.nextReencounterAt,
    today,
  );
  const recentReencounterPenalty = recentReencounterPenaltyFor(
    daysSinceLastReencounter,
  );
  const overViewedPenalty =
    viewCount >= 10 ? REENCOUNTER_SCORE_V1.overViewedPenalty : 0;
  const randomBonus =
    Math.max(0, Math.min(1, random())) * REENCOUNTER_SCORE_V1.randomBonusMax;
  const score =
    longAbsenceBonus +
    favoriteBonus +
    lowViewBonus +
    recentActivity.score +
    dueScheduleBonus +
    randomBonus +
    recentReencounterPenalty +
    overViewedPenalty;
  const reasonType = dominantReasonFor([
    {
      priority: 1,
      score: longAbsenceBonus,
      type: "long_absence",
    },
    {
      priority: 2,
      score: lowViewBonus,
      type: "low_view",
    },
    {
      priority: 3,
      score: recentActivity.score,
      type: "recent_activity",
    },
    {
      priority: 4,
      score: favoriteBonus,
      type: "favorite",
    },
    {
      priority: 5,
      score: randomBonus,
      type: "random_discovery",
    },
  ]);

  return {
    randomBonus,
    reason: reasonTextFor({
      daysSinceLastViewed,
      recentActivityReason: recentActivity.reason,
      reasonType,
    }),
    reasonLabel: reasonLabelFor(reasonType),
    reasonType,
    score,
  };
}
