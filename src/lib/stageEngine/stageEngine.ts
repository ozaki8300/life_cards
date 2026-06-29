import type { Card } from "@/lib/types";

import {
  createStageContextFromCard,
  type StageContext,
} from "./stageContext";

const fallbackStageText = [
  "いつかの一日。",
  "この日、あなたはこのカードを残しました。",
] as const;

export function createStageTextFromContext(context: StageContext): string[] {
  const { month, year } = context.date;
  const seasonLabel = context.season.label;

  if (year === undefined || month === undefined || !seasonLabel) {
    return [...fallbackStageText];
  }

  return [
    `${year}年${month}月。${seasonLabel}。`,
    "この日、あなたはこのカードを残しました。",
  ];
}

export function createStageTextForCard(card: Card): string[] {
  return createStageTextFromContext(createStageContextFromCard(card));
}
