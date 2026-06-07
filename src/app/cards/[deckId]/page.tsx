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

export const dynamic = "force-dynamic";
export const dynamicParams = true;

export default async function DeckCardsPage({ params }: Props) {
  const { deckId } = await params;
  const deck = decks.find((item) => item.id === deckId);
  const deckName = deck?.name ?? deckId;
  const deckCards = cards.filter((card) => card.deckId === deckId);

  return (
    <main className="min-h-screen bg-[#f7f3ea] px-5 py-8 text-[#2f2a23] sm:px-8 lg:px-12">
      <section className="mx-auto max-w-6xl">
        <CardsPageHeader cardCount={deckCards.length} deckName={deckName} />

        <CardHome cards={cards} decks={decks} activeDeckId={deckId} />
      </section>
      <NewCardFab href={`/cards/${deckId}/new`} />
    </main>
  );
}
