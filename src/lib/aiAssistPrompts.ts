export type LifeCardAiAssistValues = {
  backMemo: string;
  comment: string;
  front: string;
};

function normalizePromptValue(value: string) {
  return value.trim() || "未入力";
}

export function createImageToCardPrompt() {
  return [
    "あなたはLife Cards編集アシスタントです。",
    "",
    "添付画像を分析し、",
    "Life Card形式で出力してください。",
    "",
    "出力形式:",
    "",
    "# Life Card",
    "",
    "## Front",
    "",
    "20文字以内",
    "",
    "## Comment",
    "",
    "40文字以内",
    "",
    "## Back Memo",
    "",
    "### 要約",
    "",
    "### 気づき",
    "",
    "### 次のアクション",
    "",
    "目的は",
    "未来の自分が再会した時に",
    "当時の意味や感情を思い出せることです。",
    "",
    "事実の説明ではなく、",
    "出来事の意味を抽出してください。",
  ].join("\n");
}

export function createCardToImagePrompt(values: LifeCardAiAssistValues) {
  return [
    "以下のLife Cardを象徴する",
    "縦長トレーディングカード風アートを作成してください。",
    "",
    "Front:",
    normalizePromptValue(values.front),
    "",
    "Comment:",
    normalizePromptValue(values.comment),
    "",
    "Back Memo:",
    normalizePromptValue(values.backMemo),
    "",
    "要求:",
    "",
    "- 縦長カード比率",
    "- 実写寄り",
    "- 高品質",
    "- 文字なし",
    "- 出来事そのものではなく意味を象徴する",
    "- 記憶に残る構図",
    "- Life Cardsの世界観に合う",
  ].join("\n");
}
