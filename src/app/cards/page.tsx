import Link from "next/link";

import CardHome from "@/components/CardHome";
import CardsPageHeader from "@/components/cards/CardsPageHeader";
import { cards } from "@/data/cards/cards";
import { decks } from "@/data/decks/decks";

export default function CardsPage() {
  return (
    <main className="min-h-screen bg-[#f7f3ea] px-5 py-8 text-[#2f2a23] sm:px-8 lg:px-12">
      <section className="mx-auto max-w-6xl">
        <CardsPageHeader />

        <CardHome cards={cards} decks={decks} />
      </section>
      <Link
        href="/cards/new"
        aria-label="New card"
        className="fixed bottom-[calc(env(safe-area-inset-bottom)+1.5rem)] left-1/2 z-40 flex h-16 w-16 -translate-x-1/2 items-center justify-center rounded-full bg-[#2f2a23] text-4xl font-light leading-none text-[#fffaf0] shadow-[0_18px_46px_rgba(87,72,52,0.32)] transition hover:bg-[#4a4034] focus:outline-none focus:ring-2 focus:ring-[#2f2a23] focus:ring-offset-4 focus:ring-offset-[#f7f3ea] sm:bottom-8 sm:left-[min(calc(100%-6rem),calc(50%+33rem))] sm:translate-x-0"
      >
        +
      </Link>
    </main>
  );
}
