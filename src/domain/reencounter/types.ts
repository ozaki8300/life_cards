import type { Card } from "@/lib/types";

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
  today?: string;
};

export type ReencounterPickOptions = {
  limit?: number;
  random?: () => number;
};

export type ReencounterScoreInput = {
  metadata?: EncounterMetadata;
  isFavorite: boolean;
  random?: () => number;
  today?: string;
};

export type ReencounterScoreResult = {
  randomBonus: number;
  reason: string;
  score: number;
};

export type ReencounterCandidate = {
  card: Card;
  reason: string;
  score: number;
};

export type ReencounterScheduleInput = {
  viewedAt: string;
  intervalDays?: number;
};
