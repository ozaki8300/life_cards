import type { Card } from "./types";

type CopyForAiMarkdownOptions = {
  deckLabel?: string;
};

function normalizeText(value: string | undefined) {
  return value?.trim() || "未入力";
}

function optionalSection(title: string, value: string | undefined) {
  const normalized = value?.trim();

  if (!normalized) {
    return "";
  }

  return `## ${title}\n${normalized}`;
}

export function createCopyForAiMarkdown(
  card: Card,
  options: CopyForAiMarkdownOptions = {},
) {
  const deckLabel = options.deckLabel?.trim();
  const linkUrl = card.linkUrl?.trim();
  const sections = [
    "# Life Card",
    deckLabel ? `## Deck\n${deckLabel}` : "",
    `## Front\n${normalizeText(card.frontText)}`,
    optionalSection("Comment", card.frontComment),
    optionalSection("Back Memo", card.backText),
    linkUrl ? `## Link\n${linkUrl}` : "",
    [
      "## Request",
      "このLife Cardについて、Back Memoとしてそのまま保存・表示できるMarkdown本文を作成してください。",
      "",
      "必須構造:",
      "## 要約",
      "2〜5段落で書く。",
      "",
      "---",
      "",
      "## 気づき",
      "- 箇条書きで3〜7個書く。",
      "",
      "---",
      "",
      "## 次のアクション",
      "- 箇条書きで1〜5個書く。",
      "",
      "---",
      "",
      "## 再会した時に思い出したいこと",
      "未来の自分へのメッセージとして書く。",
      "",
      "Markdownルール:",
      "- Markdownコードブロック（```markdown や ```）は付けない",
      "- 見出しは `##` を使う",
      "- 見出しは必ず `## 要約`、`## 気づき`、`## 次のアクション`、`## 再会した時に思い出したいこと` の4つだけを、この順番で使う",
      "- 箇条書きは `- ` を使う",
      "- 重要キーワードは `**太字**` にする",
      "- 人物名・概念名・フレームワーク名は初出時に `**太字**` にする",
      "- 特に重要な学びは1〜3箇所だけ `**太字**` にする",
      "- セクション区切りには `---` を使う",
      "- 表は使用しない",
      "- 絵文字は使用しない",
      "- コードブロックは使用しない",
      "- 同じ文言の繰り返しは避ける",
      "- 保存される本文そのものがMarkdownとして自然に読める形にする",
      "",
      "Life Cards特有ルール:",
      "- 単なる要約で終わらせない",
      "- 「なぜ印象に残ったのか」を抽出する",
      "- 「自分の仕事・人生との接点」を考察する",
      "- 「再会した時に思い出したいこと」を必ず記述する",
      "- 講義内容や資料内容よりも、未来の自分に残す価値を優先する",
      "- 読書メモではなく人生の記録として書く",
      "",
      "出力例の骨格:",
      "## 要約",
      "",
      "本文1...",
      "",
      "本文2...",
      "",
      "---",
      "",
      "## 気づき",
      "",
      "- 気づき1",
      "- 気づき2",
      "- 気づき3",
      "",
      "---",
      "",
      "## 次のアクション",
      "",
      "- アクション1",
      "- アクション2",
      "",
      "---",
      "",
      "## 再会した時に思い出したいこと",
      "",
      "未来の自分へのメッセージ...",
    ].join("\n"),
  ];

  return sections.filter(Boolean).join("\n\n");
}
