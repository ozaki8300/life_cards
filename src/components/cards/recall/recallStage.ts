import type { Card } from "@/lib/types";

const monthStageText: Record<number, string> = {
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

function datePartsFromCreatedAt(createdAt: string) {
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

export function createRecallStageText(card: Card): string[] {
  const dateParts = datePartsFromCreatedAt(card.createdAt);

  if (!dateParts) {
    return ["いつかの一日。", "この日、あなたはこのカードを残しました。"];
  }

  const monthText = `${dateParts.year}年${dateParts.month}月。${monthStageText[dateParts.month]}。`;

  return [monthText, "この日、あなたはこのカードを残しました。"];
}
