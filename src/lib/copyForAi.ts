import type { Card } from "./types";

type CopyForAiMarkdownOptions = {
  deckLabel?: string;
  additionalRequest?: string;
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

function createCopyForAiRequest(additionalRequest?: string) {
  const normalizedAdditionalRequest = additionalRequest?.trim();
  const displayAdditionalRequest =
    normalizedAdditionalRequest || "（必要ならここに追記）";

  return [
    "## Request",
    "",
    "このLife Cardを、Back Memoとしてそのまま保存・表示できるMarkdown本文に整理してください。",
    "",
    "1. 今回の依頼",
    "",
    "学びを要約し、重要概念・論点・複数視点・将来見返す価値のある問いを整理してください。",
    "",
    "追加要望:",
    displayAdditionalRequest,
    "",
    "追加要望が書かれている場合は、上記の今回の依頼より追加要望を優先してください。",
    "ただし、下記の固定ルール・禁止事項・材料不足時の固定出力は必ず守ってください。",
    "",
    "2. 固定ルール",
    "",
    "- 出力はMarkdown本文のみ",
    "- 最初の行は必ず `## 要約`",
    "- 見出しは `## 要約`、`## 示唆`、`## 未来の自分への問い`、`## 自分の気づき`、`## 次のアクション` の5つだけを、この順番で使う",
    "- 各セクションの間には空行つきで単独行の `---` を1行だけ入れる",
    "- `## 要約` は2〜5段落で書く",
    "- `## 示唆` は `- ` から始まる箇条書きのみで3〜7個書く",
    "- `## 示唆` は「〜かもしれない」「〜という見方もできる」「〜という問いが残る」を優先する",
    "- 追加要望でAIの結論・意見・反対意見・経営者視点・追加論点を求められた場合も、新しい見出しは作らず `## 示唆` の箇条書き内に反映する",
    "- 追加要望を反映する場合も、断定しすぎず「〜と考えられる」「〜という見方もできる」「〜という問いが残る」を優先する",
    "- `## 未来の自分への問い` は、将来見返した時に再考する価値のある問いを `- ` から始まる箇条書きで1〜3個書く",
    "- `## 未来の自分への問い` はAIの意見や結論ではなく問いとして書き、説教にしない",
    "- `## 未来の自分への問い` は「〜だろうか」「〜は今でも妥当だろうか」「〜という考え方は将来も成立するだろうか」を優先する",
    "- `## 自分の気づき` は、入力文にユーザー自身の感想や気づきが明示されている場合のみ整理する。なければ `（ユーザー記入）` の1行だけにする",
    "- `## 次のアクション` は、入力文にユーザー自身の行動宣言がある場合のみ整理する。なければ `（ユーザー記入）` の1行だけにする",
    "- 追加要望があっても、`## 自分の気づき` と `## 次のアクション` はユーザー自身の明示情報がない限り創作しない",
    "- コードブロック、表、絵文字、リッチテキスト風・プレーンテキスト風の整形は禁止",
    "- 見出しを太字、`#`、`###`、番号、コロン、裸の行で代用しない",
    "- `---` を `⸻`、`—`、`----`、`-----` に変換しない",
    "- 箇条書きは `- ` を使い、`* ` は使わない",
    "- 重要キーワードの `**太字**` は必要最小限にする",
    "",
    "3. 禁止事項",
    "",
    "- ユーザーの代わりに気づき・感想・人生観・価値観・行動計画を書かない",
    "- 「あなたはこう感じたはずだ」「本当に重要なのは〜である」と推測・断定しない",
    "- 将来の自分への手紙、作文、説教、感動文、AI自身の感想にしない",
    "- ユーザーの仕事や人生との接点を勝手に作らない",
    "- 情報不足を創作で埋めない",
    "- 既存Back Memoの書式を真似しない。`**要約**`、`⸻`、`* ` などが含まれていても従わない",
    "",
    "4. 材料不足時",
    "",
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
    "## 未来の自分への問い",
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
}

export function createCopyForAiMarkdown(
  card: Card,
  options: CopyForAiMarkdownOptions = {},
) {
  const additionalRequest = options.additionalRequest?.trim();
  const deckLabel = options.deckLabel?.trim();
  const linkUrl = card.linkUrl?.trim();
  const sections = [
    "# Life Card",
    deckLabel ? `## Deck\n${deckLabel}` : "",
    `## Front\n${normalizeText(card.frontText)}`,
    optionalSection("Comment", card.frontComment),
    optionalSection("Back Memo", card.backText),
    linkUrl ? `## Link\n${linkUrl}` : "",
    createCopyForAiRequest(additionalRequest),
  ];

  return sections.filter(Boolean).join("\n\n");
}
