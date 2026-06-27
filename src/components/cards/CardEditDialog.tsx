"use client";

import { CardRepository } from "@/lib/cardRepository";
import type { Card, Deck } from "@/lib/types";
import { useEscapeKey } from "@/lib/useEscapeKey";

import CardForm, {
  type CardFormSubmitContext,
  type CardFormValues,
} from "./CardForm";
import { todayInputValue } from "./cardFormUtils";

export default function CardEditDialog({
  card,
  currentCards,
  decks,
  onClose,
  onDecksChange,
  onSaved,
}: {
  card: Card;
  currentCards: Card[];
  decks: Deck[];
  onClose: () => void;
  onDecksChange?: (decks: Deck[]) => void;
  onSaved?: (card: Card) => void;
}) {
  useEscapeKey(onClose);
  const persistedImageStoragePath =
    card.imageStoragePath ??
    currentCards.find((item) => item.id === card.id)?.imageStoragePath ??
    "";

  async function handleSubmit(
    values: CardFormValues,
    context: CardFormSubmitContext,
  ) {
    const nextCard: Card = {
      ...card,
      deckId: values.deckId,
      defaultImageKey: values.defaultImageKey,
      imageFitMode: values.imageFitMode,
      imageFrameMode: values.imageFrameMode,
      imagePath: values.imagePath,
      imageStoragePath: values.imageStoragePath,
      linkUrl: values.linkUrl,
      frontText: values.frontText,
      frontComment: values.frontComment,
      backText: values.backText,
      createdAt: values.cardDate,
      updatedAt: todayInputValue(),
    };

    const nextCards = await CardRepository.updateCardForCurrentUser(
      nextCard,
      currentCards,
      {
        expectsCloudSave: context.expectsCloudSave,
      },
    );
    onSaved?.(nextCards.find((item) => item.id === nextCard.id) ?? nextCard);
    alert("編集内容を保存しました。");
    onClose();
  }

  return (
    <div className="mx-auto max-h-[calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-1.5rem)] w-full max-w-[min(1280px,calc(100vw-1.5rem))] overflow-x-hidden overflow-y-auto rounded-[18px] border border-[#e8ddcb] bg-[#fffaf0] p-4 shadow-[0_28px_80px_rgba(87,72,52,0.28)] [-webkit-overflow-scrolling:touch] sm:max-h-[calc(100dvh-32px)] sm:p-5 lg:max-w-full lg:p-4 xl:p-4">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold text-[#332d25]">カードを編集</h2>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full border border-[#e0d3c0] bg-white/72 px-3 py-1.5 text-sm font-semibold text-[#7d705f] transition hover:bg-white"
        >
          閉じる
        </button>
      </div>

      <CardForm
        deckOptions={decks}
        initialValues={{
          backText: card.backText ?? "",
          cardDate: card.createdAt,
          defaultImageKey: card.defaultImageKey ?? "paper",
          deckId: card.deckId,
          frontComment: card.frontComment ?? "",
          frontText: card.frontText ?? "",
          imageFitMode: card.imageFitMode ?? "cover",
          imageFrameMode: card.imageFrameMode ?? "none",
          imagePath: card.imagePath ?? "",
          imageStoragePath: persistedImageStoragePath,
          linkUrl: card.linkUrl ?? "",
        }}
        mode="edit"
        onCancel={onClose}
        onDecksChange={onDecksChange}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
