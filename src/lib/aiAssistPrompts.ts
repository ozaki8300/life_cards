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
    "添付画像を手がかりに、",
    "未来の自分がその日を思い出せるLife Cardを作るための下書きを出力してください。",
    "",
    "目的は文章を完成させることではありません。",
    "ユーザー自身の記憶が戻るように、事実、舞台、心の動き、未来への小さな問いを残すことです。",
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
    "### 何があったか",
    "",
    "画像から分かる事実や学びを、決めつけずに短く整理してください。",
    "",
    "### あの日の手がかり",
    "",
    "場所、季節、時間帯、人の気配、音、空気感など、思い出す助けになりそうな要素を書いてください。",
    "画像だけでは分からないことは断定せず、自然な問いとして残してください。",
    "",
    "### 心が動いたところ",
    "",
    "印象に残った点、気づき、違和感、嬉しさ、悔しさなどを、押しつけずに引き出してください。",
    "",
    "### 未来の自分への問い",
    "",
    "次のような問いを2〜4個だけ入れてください。",
    "- その日はどこにいましたか？",
    "- 誰といましたか？",
    "- 一番印象に残った音は何ですか？",
    "- その時の空気はどんな感じでしたか？",
    "- 何に心が動きましたか？",
    "- 未来の自分に一言残すなら何ですか？",
    "",
    "学びカードの場合は、要点、示唆、次に活かすことも含めてください。",
    "ただし、要約だけで終わらせず、未来の自分が当時の場面や気持ちを思い出せる問いを必ず残してください。",
    "",
    "注意:",
    "",
    "- 感情を決めつけない",
    "- 盛りすぎない",
    "- 断定できないことは問いにする",
    "- 過剰に詩的にしない",
    "- ユーザーが自分の言葉で直せる余白を残す",
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
