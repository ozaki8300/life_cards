import DeckCard from "@/components/DeckCard";
import { cards } from "@/data/cards/cards";
import { decks } from "@/data/decks/decks";

function cardCountForDeck(deckId: string) {
  return cards.filter((card) => card.deckId === deckId).length;
}

export default function CardsPage() {
  return (
    <main className="min-h-screen bg-[#f7f3ea] px-5 py-8 text-[#2f2a23] sm:px-8 lg:px-12">
      <section className="mx-auto max-w-6xl">
        <header className="mb-7">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Life Cards
          </h1>
          <p className="mt-2 text-sm font-medium uppercase tracking-[0.24em] text-[#8d7f6e]">
            Private Decks
          </p>
        </header>

        <div className="grid grid-cols-2 gap-4 sm:gap-5 md:grid-cols-4">
          {decks.map((deck) => (
            <DeckCard
              key={deck.id}
              name={deck.name}
              cardCount={cardCountForDeck(deck.id)}
              isShared={deck.isShared}
              coverImage={deck.coverImage}
              href={`/cards/${deck.id}`}
            />
          ))}
        </div>
      </section>
    </main>
  );
}
