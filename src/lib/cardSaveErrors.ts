export type CardSaveErrorReason =
  | "cloud-save-failed"
  | "image-upload-failed";

export class CardSaveError extends Error {
  reason: CardSaveErrorReason;

  constructor(reason: CardSaveErrorReason, message: string, cause?: unknown) {
    super(message);
    this.name = "CardSaveError";
    this.reason = reason;
    this.cause = cause;
  }
}

export function cardSaveErrorMessage(error: unknown) {
  if (error instanceof CardSaveError) {
    if (error.reason === "image-upload-failed") {
      return "画像をクラウドに保存できませんでした。画像サイズや通信状態を確認してください。";
    }

    return "クラウドにカードを保存できませんでした。通信状態を確認してもう一度お試しください。";
  }

  return "カードを保存できませんでした。通信状態を確認してもう一度お試しください。";
}
