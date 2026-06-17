import type { Card } from "@/lib/types";

export type ReencounterReasonType =
  | "long_absence"
  | "favorite"
  | "recent_activity"
  | "low_view"
  | "deck_diversity"
  | "random_discovery";

export type EncounterMetadata = {
  cardId: string;
  firstViewedAt?: string;
  lastViewedAt?: string;
  viewCount: number;
  lastReencounterAt?: string;
  nextReencounterAt?: string;
};

export type ReencounterPickInput = {
  cards: Card[];
  favoriteIds: ReadonlySet<string>;
  metadataByCardId?: Record<string, EncounterMetadata>;
  today: string;
};

export type ReencounterPickOptions = {
  limit?: number;
  random?: () => number;
};

export type ReencounterScoreInput = {
  card: Card;
  metadata?: EncounterMetadata;
  isFavorite: boolean;
  random?: () => number;
  today: string;
};

export type ReencounterScoreResult = {
  randomBonus: number;
  reason: string;
  reasonLabel: string;
  reasonType: ReencounterReasonType;
  score: number;
};

export type ReencounterCandidate = {
  card: Card;
  reason: string;
  reasonLabel: string;
  reasonType: ReencounterReasonType;
  score: number;
};

export type ReencounterScheduleInput = {
  viewedAt: string;
  intervalDays?: number;
};
