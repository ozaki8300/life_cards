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
    "## Request\nこのLife Cardについて、要約・気づき・次のアクションを整理してください。",
  ];

  return sections.filter(Boolean).join("\n\n");
}
