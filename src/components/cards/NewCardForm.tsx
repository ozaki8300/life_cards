"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { CardRepository } from "@/lib/cardRepository";
import type { Card, Deck } from "@/lib/types";

import CardForm, { type CardFormValues } from "./CardForm";
import { todayInputValue } from "./cardFormUtils";

type Props = {
  backHref: string;
  deckId?: string;
  deckName?: string;
  deckOptions?: Deck[];
};

export default function NewCardForm({
  backHref,
  deckId,
  deckOptions = [],
}: Props) {
  const router = useRouter();
  const [saveErrorMessage, setSaveErrorMessage] = useState("");
  const initialDeckId = deckId ?? deckOptions[0]?.id ?? "";

  async function handleSubmit(values: CardFormValues) {
    setSaveErrorMessage("");

    const nextCard: Card = {
      id: `card_${Date.now()}`,
      deckId: values.deckId,
      imageFitMode: values.imageFitMode,
      imagePath: values.imagePath,
      linkUrl: values.linkUrl,
      frontText: values.frontText,
      frontComment: values.frontComment,
      backText: values.backText,
      createdAt: values.cardDate,
      updatedAt: todayInputValue(),
      isFavorite: false,
    };

    console.log("Life Cards new card payload", {
      id: nextCard.id,
      imageFitMode: nextCard.imageFitMode,
    });

    try {
      await CardRepository.saveCardForCurrentUser(nextCard);
      console.log("Life Cards saved", nextCard);
      router.push(backHref);
    } catch (error) {
      console.warn("Life Cards new card save failed", error);
      setSaveErrorMessage(
        "カードを保存できませんでした。画像サイズが大きい可能性があります。",
      );
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f3ea] px-5 py-5 text-[#2f2a23] sm:px-8 lg:px-10">
      <section className="mx-auto max-w-[1400px]">
        <header className="mb-4 flex items-center justify-between gap-4">
          <Link
            href={backHref}
            className="text-sm font-medium text-[#8d7f6e] transition hover:text-[#2f2a23]"
          >
            Back
          </Link>
          <h1 className="text-lg font-bold tracking-tight sm:text-2xl">
            新しいカード
          </h1>
          <span className="w-10" aria-hidden="true" />
        </header>

        {saveErrorMessage ? (
          <p className="mb-4 rounded-[14px] border border-[#e7b8a9] bg-[#fff2ee] px-4 py-3 text-sm font-semibold text-[#a24d3c]">
            {saveErrorMessage}
          </p>
        ) : null}

        <CardForm
          cardId="new_card_preview"
          deckOptions={deckOptions}
          initialValues={{
            backText: "",
            cardDate: todayInputValue(),
            deckId: initialDeckId,
            frontComment: "",
            frontText: "",
            imageFitMode: "cover",
            imagePath: "",
            linkUrl: "",
          }}
          mode="new"
          onSubmit={handleSubmit}
        />
      </section>
    </main>
  );
}
