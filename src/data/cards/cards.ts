import { Card } from "@/lib/types";

export const cards: Card[] = [
  {
    id: "memory-rain-stone",
    deckId: "daily-scenes",
    imagePath: "/card-images/default-sea.webp",
    isFavorite: true,
    frontText: "雨上がりの石畳",
    frontComment: "観光地よりも、こういう名前のない景色が記憶に残る。",
    backText:
      "朝の散歩中に見つけた風景。\n予定通りの旅行より、偶然出会った景色の方が、あとから何度も思い出す。",
    createdAt: "2026-06-06",
    updatedAt: "2026-06-06",
  },
  {
    id: "learning-open-book",
    deckId: "learning-notes",
    imagePath: "/card-images/default-library.webp",
    isFavorite: true,
    frontText: "読みかけの本",
    frontComment: "その時の自分に必要だった一文。",
    backText:
      "読み終えた内容よりも、ふと線を引いた一文の方が残ることがある。\nLife Cardsには、そういう小さな気づきを残しておきたい。",
    createdAt: "2026-06-06",
    updatedAt: "2026-06-06",
  },
  {
    id: "memory-evening-way-home",
    deckId: "daily-scenes",
    imagePath: "/card-images/default-night.webp",
    frontText: "夕方の帰り道",
    frontComment: "何でもない一日が、あとから大切になる。",
    backText:
      "特別な出来事ではない。\nでも、空の色や帰り道の空気は、不思議と記憶に残っている。",
    createdAt: "2026-06-06",
    updatedAt: "2026-06-06",
  },
  {
    id: "learning-small-step",
    deckId: "learning-notes",
    imagePath: "/card-images/default-mountain.webp",
    frontText: "小さな達成",
    frontComment: "できなかったことが、少しだけできた日。",
    backText:
      "大きな成功ではなくてもよい。\n昨日より一歩進んだことを、ちゃんと残しておく。",
    createdAt: "2026-06-06",
    updatedAt: "2026-06-06",
  },
  {
    id: "travel-quiet-view",
    deckId: "travel-memories",
    imagePath: "/card-images/default-sea.jpg",
    frontText: "海辺の朝",
    frontComment: "予定を詰めなかった日ほど、あとからよく思い出す。",
    backText:
      "早起きして、少しだけ海を見に行った。\n何かをしたわけではないけれど、その静けさを忘れたくなかった。",
    createdAt: "2026-06-06",
    updatedAt: "2026-06-06",
  },
];
