import type { Card } from "@/lib/types";

export type StageContextSource = "card" | "inferred" | "unknown";

export type StageDateContext = {
  createdAt: string;
  month?: number;
  source: StageContextSource;
  year?: number;
};

export type StageSeasonContext = {
  confidence: "inferred" | "unknown";
  label?: string;
  source: StageContextSource;
};

export type StageContext = {
  coreCard: {
    backMemo?: string;
    comment?: string;
    createdAt: string;
    front?: string;
    imagePath?: string;
  };
  date: StageDateContext;
  season: StageSeasonContext;
};

const monthSeasonText: Record<number, string> = {
  1: "冬の深まりの頃",
  2: "春を待つ頃",
  3: "春の気配が近づく頃",
  4: "春の始まりの頃",
  5: "光がやわらかく広がる頃",
  6: "雨音が季節を進める頃",
  7: "夏が立ち上がる頃",
  8: "夏の熱が残る頃",
  9: "秋の入口に立つ頃",
  10: "秋が深まりはじめる頃",
  11: "冬支度が始まる頃",
  12: "一年が静かに閉じていく頃",
};

export function datePartsFromCreatedAt(createdAt: string) {
  const match = createdAt.match(/^(\d{4})-(\d{2})/);

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);

  if (!Number.isInteger(year) || !Number.isInteger(month)) {
    return null;
  }

  if (month < 1 || month > 12) {
    return null;
  }

  return { month, year };
}

export function seasonLabelForMonth(month: number) {
  return monthSeasonText[month];
}

export function createStageContextFromCard(card: Card): StageContext {
  const dateParts = datePartsFromCreatedAt(card.createdAt);
  const seasonLabel = dateParts
    ? seasonLabelForMonth(dateParts.month)
    : undefined;

  return {
    coreCard: {
      backMemo: card.backText,
      comment: card.frontComment,
      createdAt: card.createdAt,
      front: card.frontText,
      imagePath: card.imagePath,
    },
    date: {
      createdAt: card.createdAt,
      month: dateParts?.month,
      source: dateParts ? "card" : "unknown",
      year: dateParts?.year,
    },
    season: {
      confidence: seasonLabel ? "inferred" : "unknown",
      label: seasonLabel,
      source: seasonLabel ? "inferred" : "unknown",
    },
  };
}
