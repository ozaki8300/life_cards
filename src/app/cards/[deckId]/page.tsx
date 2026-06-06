import Link from "next/link";
import { notFound } from "next/navigation";

import { cards } from "@/data/cards/cards";
import { decks } from "@/data/decks/decks";
import { Card } from "@/lib/types";

type Props = {
  params: Promise<{
    deckId: string;
  }>;
};

function CardPreview({ card, index }: { card: Card; index: number }) {
  const accents = [
    "from-sky-300/70 via-teal-500/35 to-zinc-950",
    "from-rose-300/75 via-fuchsia-600/35 to-zinc-950",
    "from-amber-200/75 via-orange-700/35 to-zinc-950",
  ];

  return (
    <article className="group relative aspect-[3/4] rounded-lg">
      <div className="absolute inset-x-2 top-2 h-full rounded-lg border border-white/10 bg-zinc-800/80 shadow-xl shadow-black/40 transition group-hover:translate-y-1" />
      <div className="absolute inset-x-1 top-1 h-full rounded-lg border border-white/10 bg-zinc-700/80 shadow-xl shadow-black/40 transition group-hover:translate-y-0.5" />

      <div className={`relative flex h-full flex-col justify-between overflow-hidden rounded-lg border border-white/15 bg-gradient-to-br ${accents[index % accents.length]} p-3 shadow-2xl shadow-black/50 transition duration-200 group-hover:-translate-y-1 group-hover:border-white/30 sm:p-4`}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_24%_16%,rgba(255,255,255,0.24),transparent_30%),linear-gradient(to_top,rgba(0,0,0,0.82),rgba(0,0,0,0.08))]" />
        <div className="relative h-12 w-12 rounded-md border border-white/20 bg-white/12 backdrop-blur" />

        <div className="relative">
          <h2 className="text-base font-semibold leading-tight text-white sm:text-lg">
            {card.frontText}
          </h2>
          {card.backText ? (
            <p className="mt-2 text-xs font-medium uppercase tracking-[0.18em] text-white/55">
              {card.backText}
            </p>
          ) : null}
        </div>
      </div>
    </article>
  );
}

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

        <div className="grid grid-cols-2 gap-4 sm:gap-5 md:grid-cols-4">
          {deckCards.map((card, index) => (
            <CardPreview
              key={card.id}
              card={card}
              index={index}
            />
          ))}
        </div>
      </section>
    </main>
  );
}
