import type {
  TimeMachineBucket,
  TimeMachineBucketType,
  TimeMachineCandidate,
  TimeMachinePickInput,
} from "./types";
import {
  absoluteDaysBetween,
  addDays,
  addMonths,
  getIsoWeekNumber,
  parseDatePart,
} from "./dateUtils";

const DEFAULT_LIMIT_PER_BUCKET = 4;

type BucketDefinition = {
  label: string;
  targetDate: string;
  type: TimeMachineBucketType;
  windowDays?: number;
};

type IndexedCandidate = TimeMachineCandidate & {
  createdAt: string;
  index: number;
  updatedAt: string;
};

function buildBucketDefinitions(today: string): BucketDefinition[] {
  const oneYearAgo = addMonths(today, -12);
  const sixMonthsAgo = addMonths(today, -6);
  const thirtyDaysAgo = addDays(today, -30);

  return [
    oneYearAgo
      ? {
          label: "1年前の今日",
          targetDate: oneYearAgo,
          type: "one_year_ago",
          windowDays: 3,
        }
      : null,
    sixMonthsAgo
      ? {
          label: "半年前の今日",
          targetDate: sixMonthsAgo,
          type: "six_months_ago",
          windowDays: 7,
        }
      : null,
    thirtyDaysAgo
      ? {
          label: "30日前のカード",
          targetDate: thirtyDaysAgo,
          type: "thirty_days_ago",
          windowDays: 2,
        }
      : null,
    {
      label: "この週に作ったカード",
      targetDate: today,
      type: "same_week",
    },
    {
      label: "同じ季節のカード",
      targetDate: oneYearAgo ?? today,
      type: "same_season",
      windowDays: 45,
    },
  ].filter((definition): definition is BucketDefinition =>
    Boolean(definition),
  );
}

function isWithinDateWindow({
  createdAt,
  targetDate,
  windowDays,
}: {
  createdAt: string;
  targetDate: string;
  windowDays: number;
}) {
  const daysFromTarget = absoluteDaysBetween(createdAt, targetDate);

  return daysFromTarget !== null && daysFromTarget <= windowDays;
}

function isInSameIsoWeek(createdAt: string, today: string) {
  const createdWeek = getIsoWeekNumber(createdAt);
  const todayWeek = getIsoWeekNumber(today);

  return createdWeek !== null && todayWeek !== null && createdWeek === todayWeek;
}

function matchesBucket({
  createdAt,
  definition,
  today,
}: {
  createdAt: string;
  definition: BucketDefinition;
  today: string;
}) {
  if (definition.type === "same_week") {
    return isInSameIsoWeek(createdAt, today);
  }

  if (definition.windowDays === undefined) {
    return false;
  }

  return isWithinDateWindow({
    createdAt,
    targetDate: definition.targetDate,
    windowDays: definition.windowDays,
  });
}

function compareCandidates(a: IndexedCandidate, b: IndexedCandidate) {
  const daysCompare = a.daysFromTarget - b.daysFromTarget;

  if (daysCompare !== 0) {
    return daysCompare;
  }

  const createdAtCompare = b.createdAt.localeCompare(a.createdAt);

  if (createdAtCompare !== 0) {
    return createdAtCompare;
  }

  const updatedAtCompare = b.updatedAt.localeCompare(a.updatedAt);

  return updatedAtCompare === 0 ? a.index - b.index : updatedAtCompare;
}

function buildCandidate(
  definition: BucketDefinition,
  card: TimeMachinePickInput["cards"][number],
  index: number,
): IndexedCandidate | null {
  const daysFromTarget = absoluteDaysBetween(card.createdAt, definition.targetDate);

  if (daysFromTarget === null) {
    return null;
  }

  return {
    bucketLabel: definition.label,
    bucketType: definition.type,
    card,
    createdAt: card.createdAt.slice(0, 10),
    daysFromTarget,
    index,
    matchedDate: card.createdAt.slice(0, 10),
    targetDate: definition.targetDate,
    updatedAt: parseDatePart(card.updatedAt) ? card.updatedAt.slice(0, 10) : "",
  };
}

function pick({
  cards,
  limitPerBucket = DEFAULT_LIMIT_PER_BUCKET,
  today,
}: TimeMachinePickInput): TimeMachineBucket[] {
  if (!parseDatePart(today) || limitPerBucket <= 0) {
    return [];
  }

  const validCards = cards
    .map((card, index) => ({
      card,
      index,
    }))
    .filter(({ card }) => parseDatePart(card.createdAt));
  const bucketDefinitions = buildBucketDefinitions(today);

  return bucketDefinitions.flatMap((definition) => {
    const candidates = validCards
      .filter(({ card }) =>
        matchesBucket({
          createdAt: card.createdAt,
          definition,
          today,
        }),
      )
      .map(({ card, index }) => buildCandidate(definition, card, index))
      .filter((candidate): candidate is IndexedCandidate =>
        Boolean(candidate),
      )
      .sort(compareCandidates)
      .slice(0, limitPerBucket)
      .map(
        ({
          bucketLabel,
          bucketType,
          card,
          daysFromTarget,
          matchedDate,
          targetDate,
        }) => ({
          bucketLabel,
          bucketType,
          card,
          daysFromTarget,
          matchedDate,
          targetDate,
        }),
      );

    if (candidates.length === 0) {
      return [];
    }

    return [
      {
        candidates,
        label: definition.label,
        targetDate: definition.targetDate,
        type: definition.type,
      },
    ];
  });
}

export const TimeMachineEngine = {
  pick,
};
