import Link from "next/link";
import { notFound } from "next/navigation";

import CardFirstNav from "@/components/CardFirstNav";
import TradingCardGrid from "@/components/TradingCardGrid";
import { cards } from "@/data/cards/cards";
import { decks } from "@/data/decks/decks";

type Props = {
  params: Promise<{
    deckId: string;
  }>;
};

export function generateStaticParams() {
  return decks.map((deck) => ({
    deckId: deck.id,
  }));
}

export default async function DeckCardsPage({ params }: Props) {
  const { deckId } = await params;
  const deck = decks.find((item) => item.id === deckId);

  if (!deck) {
    notFound();
  }

  const deckCards = cards.filter((card) => card.deckId === deck.id);

  return (
    <main className="min-h-screen bg-[#f7f3ea] px-5 py-8 text-[#2f2a23] sm:px-8 lg:px-12">
      <section className="mx-auto max-w-6xl">
        <header className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link
              href="/cards"
              className="text-sm font-medium text-[#8d7f6e] transition hover:text-[#2f2a23]"
            >
              All cards
            </Link>
            <h1 className="mt-5 text-3xl font-bold tracking-tight sm:text-4xl">
              Life Cards
            </h1>
            <p className="mt-2 text-sm font-medium uppercase tracking-[0.24em] text-[#8d7f6e]">
              {deck.name} / {deckCards.length} cards
            </p>
          </div>

          <Link
            href={`/cards/${deck.id}/new`}
            className="inline-flex w-fit rounded-full bg-[#2f2a23] px-5 py-3 text-sm font-semibold text-[#fffaf0] shadow-lg shadow-[#d5cab8] transition hover:bg-[#4a4034] focus:outline-none focus:ring-2 focus:ring-[#2f2a23] focus:ring-offset-2 focus:ring-offset-[#f7f3ea]"
          >
            ＋ 新しいカード
          </Link>
        </header>

        <CardFirstNav decks={decks} activeDeckId={deck.id} />
        <TradingCardGrid cards={deckCards} />
      </section>
    </main>
  );
}
