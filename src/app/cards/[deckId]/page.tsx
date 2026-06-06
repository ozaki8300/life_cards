import Link from "next/link";
import { notFound } from "next/navigation";

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
    <main className="min-h-screen bg-black px-5 py-8 text-white sm:px-8 lg:px-12">
      <section className="mx-auto max-w-6xl">
        <header className="mb-7">
          <Link
            href="/cards"
            className="text-sm font-medium text-white/50 transition hover:text-white"
          >
            Back to decks
          </Link>
          <h1 className="mt-5 text-3xl font-bold tracking-tight sm:text-4xl">
            {deck.name}
          </h1>
          <p className="mt-2 text-sm font-medium uppercase tracking-[0.24em] text-white/45">
            {deckCards.length} cards
          </p>
        </header>

        <TradingCardGrid cards={deckCards} />
      </section>
    </main>
  );
}
