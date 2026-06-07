import Link from "next/link";
import { notFound } from "next/navigation";

import CardHome from "@/components/CardHome";
import CardsPageHeader from "@/components/cards/CardsPageHeader";
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
        <CardsPageHeader cardCount={deckCards.length} deckName={deck.name} />

        <CardHome cards={cards} decks={decks} activeDeckId={deck.id} />
      </section>
      <Link
        href={`/cards/${deck.id}/new`}
        aria-label="New card"
        className="fixed bottom-6 left-1/2 z-40 flex h-16 w-16 -translate-x-1/2 items-center justify-center rounded-full bg-[#2f2a23] text-4xl font-light leading-none text-[#fffaf0] shadow-[0_18px_46px_rgba(87,72,52,0.32)] transition hover:bg-[#4a4034] focus:outline-none focus:ring-2 focus:ring-[#2f2a23] focus:ring-offset-4 focus:ring-offset-[#f7f3ea] sm:bottom-8 sm:left-[min(calc(100%-6rem),calc(50%+33rem))] sm:translate-x-0"
      >
        +
      </Link>
    </main>
  );
}
