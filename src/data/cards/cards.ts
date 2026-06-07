import { Card } from "@/lib/types";

export const cards: Card[] = [
  {
    id: "demo-open-book",
    deckId: "demo",
    imagePath: "/card-images/default-library.webp",
    isFavorite: true,
    frontText: "読みかけの本",
    frontComment: "その時の自分に必要だった一文。",
    backText:
      "読み終えた内容よりも、ふと線を引いた一文の方が残ることがある。\n忘れた頃に見返すと、その時の自分が何を探していたのか思い出せる。",
    createdAt: "2026-06-06",
    updatedAt: "2026-06-06",
  },
  {
    id: "demo-night-note",
    deckId: "demo",
    imagePath: "/card-images/default-night.webp",
    isFavorite: true,
    frontText: "夜に残した一言",
    frontComment: "眠る前に、今日の気持ちを一行だけ残す。",
    backText:
      "大きな日記を書けなくても、一言だけなら残せる。\n時間が経ってから見ると、その短い言葉が一日の空気を連れて戻ってくる。",
    createdAt: "2026-06-06",
    updatedAt: "2026-06-06",
  },
  {
    id: "demo-small-step",
    deckId: "demo",
    imagePath: "/card-images/default-mountain.webp",
    frontText: "小さな達成",
    frontComment: "できなかったことが、少しだけできた日。",
    backText:
      "大きな成功ではなくてもよい。\n昨日より一歩進んだことを、ちゃんと残しておく。",
    createdAt: "2026-06-06",
    updatedAt: "2026-06-06",
  },
  {
    id: "demo-evening-way-home",
    deckId: "demo",
    imagePath: "/card-images/default-sea.webp",
    frontText: "夕方の帰り道",
    frontComment: "何でもない一日が、あとから大切になる。",
    backText:
      "特別な出来事ではない。\nでも、空の色や帰り道の空気は、不思議と記憶に残っている。",
    createdAt: "2026-06-06",
    updatedAt: "2026-06-06",
  },
  {
    id: "demo-quiet-insight",
    deckId: "demo",
    imagePath: "/card-images/default-library.webp",
    frontText: "忘れたくない気づき",
    frontComment: "答えよりも、問いが残った。",
    backText:
      "すぐに結論を出せない学びほど、時間が経ってから効いてくる。\n今は分からなくても、未来の自分がもう一度出会えるように残しておく。",
    createdAt: "2026-06-06",
    updatedAt: "2026-06-06",
  },
];
