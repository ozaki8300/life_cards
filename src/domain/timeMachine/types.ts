import type { Card } from "@/lib/types";

export type TimeMachineBucketType =
  | "one_year_ago"
  | "six_months_ago"
  | "thirty_days_ago"
  | "same_week"
  | "same_season";

export type TimeMachinePickInput = {
  cards: Card[];
  today: string;
  limitPerBucket?: number;
};

export type TimeMachineCandidate = {
  card: Card;
  bucketType: TimeMachineBucketType;
  bucketLabel: string;
  matchedDate: string;
  targetDate: string;
  daysFromTarget: number;
};

export type TimeMachineBucket = {
  type: TimeMachineBucketType;
  label: string;
  targetDate: string;
  candidates: TimeMachineCandidate[];
};
