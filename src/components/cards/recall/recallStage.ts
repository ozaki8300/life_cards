import { createStageTextForCard } from "@/lib/stageEngine";
import type { Card } from "@/lib/types";

export function createRecallStageText(card: Card): string[] {
  return createStageTextForCard(card);
}
