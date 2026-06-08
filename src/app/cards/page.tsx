import CardHome from "@/components/CardHome";
import NewCardFab from "@/components/cards/NewCardFab";
import { cards } from "@/data/cards/cards";
import { decks } from "@/data/decks/decks";

export default function CardsPage() {
  return (
    <main className="min-h-screen bg-[#f7f3ea] px-5 py-8 text-[#2f2a23] sm:px-8 lg:px-12">
      <section className="mx-auto max-w-6xl">
        <CardHome cards={cards} decks={decks} />
      </section>
      <NewCardFab href="/cards/new" />
    </main>
  );
}
