import { notFound } from "next/navigation";

import CardHome from "@/components/CardHome";
import CardsPageHeader from "@/components/cards/CardsPageHeader";
import NewCardFab from "@/components/cards/NewCardFab";
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
      <NewCardFab href={`/cards/${deck.id}/new`} />
    </main>
  );
}
