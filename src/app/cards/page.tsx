import Link from "next/link";

import CardHome from "@/components/CardHome";
import { cards } from "@/data/cards/cards";
import { decks } from "@/data/decks/decks";

export default function CardsPage() {
  return (
    <main className="min-h-screen bg-[#f7f3ea] px-5 py-8 text-[#2f2a23] sm:px-8 lg:px-12">
      <section className="mx-auto max-w-6xl">
        <header className="mb-7">
          <div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Life Cards
            </h1>
            <p className="mt-2 text-sm font-medium uppercase tracking-[0.24em] text-[#8d7f6e]">
              Reencounter Home
            </p>
          </div>
        </header>

        <CardHome cards={cards} decks={decks} />
      </section>
      <Link
        href="/cards/new"
        aria-label="New card"
        className="fixed bottom-6 left-1/2 z-40 flex h-16 w-16 -translate-x-1/2 items-center justify-center rounded-full bg-[#2f2a23] text-4xl font-light leading-none text-[#fffaf0] shadow-[0_18px_46px_rgba(87,72,52,0.32)] transition hover:bg-[#4a4034] focus:outline-none focus:ring-2 focus:ring-[#2f2a23] focus:ring-offset-4 focus:ring-offset-[#f7f3ea] sm:bottom-8 sm:left-[min(calc(100%-6rem),calc(50%+33rem))] sm:translate-x-0"
      >
        +
      </Link>
    </main>
  );
}
