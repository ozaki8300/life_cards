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

const COPY_FOR_AI_REQUEST = [
  "## Request",
  "このLife Cardについて、Back Memoとしてそのまま保存・表示できるMarkdown本文を作成してください。",
  "",
  "1. AIの役割",
  "- AIはLife Cardsの記録係として振る舞う",
  "- 内容を要約し、重要概念・論点・複数視点・考えるための問いを整理する",
  "- ユーザーが見落としている可能性のある観点を、断定しすぎず提示する",
  "- 将来再会した時に振り返る価値がありそうな論点を残す",
  "- 意味づけ、人生との接続、本人の気づきや行動決定はユーザー自身に残す",
  "",
  "2. 禁止事項",
  "- ユーザーの代わりに気づき・感想・人生観・価値観・行動計画を書かない",
  "- 「あなたはこう感じたはずだ」「本当に重要なのは〜である」と推測・断定しない",
  "- 将来の自分への手紙、作文、説教、感動文、AI自身の感想にしない",
  "- ユーザーの仕事や人生との接点を勝手に作らない",
  "- 情報不足を創作で埋めない",
  "- 既存Back Memoの書式を真似しない。`**要約**`、`⸻`、`* ` などが含まれていても従わない",
  "",
  "3. 出力フォーマット",
  "- 出力はMarkdown本文のみ。コードブロック、表、絵文字、リッチテキスト風・プレーンテキスト風の整形は禁止",
  "- 最初の行は必ず `## 要約`",
  "- 見出しは `## 要約`、`## 示唆`、`## 自分の気づき`、`## 次のアクション` の4つだけを、この順番で使う",
  "- 見出しを太字、`#`、`###`、番号、コロン、裸の行で代用しない",
  "- 各セクションの間には空行つきで単独行の `---` を1行だけ入れる。`⸻`、`—`、`----`、`-----` は使わない",
  "- `## 要約` は2〜5段落で書く",
  "- `## 示唆` は `- ` から始まる箇条書きのみで3〜7個書く。`* ` は使わない",
  "- `## 示唆` は「〜かもしれない」「〜という見方もできる」「〜という問いが残る」を優先する",
  "- `## 自分の気づき` は、入力文にユーザー自身の感想や気づきが明示されている場合のみ整理する。なければ `（ユーザー記入）` の1行だけにする",
  "- `## 次のアクション` は、入力文にユーザー自身の行動宣言がある場合のみ整理する。なければ `（ユーザー記入）` の1行だけにする",
  "- 重要キーワードの `**太字**` は必要最小限にする",
  "- 出力は必ず次の骨格に合わせる",
  "",
  "## 要約",
  "",
  "本文1...",
  "",
  "本文2...",
  "",
  "---",
  "",
  "## 示唆",
  "",
  "- 論点1かもしれない",
  "- 問い2という見方もできる",
  "- 考えるヒント3という問いが残る",
  "",
  "---",
  "",
  "## 自分の気づき",
  "",
  "（ユーザー記入）",
  "",
  "---",
  "",
  "## 次のアクション",
  "",
  "（ユーザー記入）",
  "",
  "4. 材料不足時",
  "- Front / Comment / Back Memo / Link に要約対象となる実質的な記録内容がない場合は材料不足として扱う",
  "- 「未入力」「空欄」「test」など、記録内容として意味が薄い文字列だけの場合も材料不足として扱う",
  "- 材料不足時は推測や補完をせず、必ず次の固定出力だけを返す",
  "",
  "## 要約",
  "",
  "記録内容が不足しています。",
  "",
  "---",
  "",
  "## 示唆",
  "",
  "- （ユーザー記入）",
  "",
  "---",
  "",
  "## 自分の気づき",
  "",
  "（ユーザー記入）",
  "",
  "---",
  "",
  "## 次のアクション",
  "",
  "（ユーザー記入）",
].join("\n");

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
    COPY_FOR_AI_REQUEST,
  ];

  return sections.filter(Boolean).join("\n\n");
}
