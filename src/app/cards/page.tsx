import Link from "next/link";

import CardFirstNav from "@/components/CardFirstNav";
import TradingCardGrid from "@/components/TradingCardGrid";
import { cards } from "@/data/cards/cards";
import { decks } from "@/data/decks/decks";

export default function CardsPage() {
  return (
    <main className="min-h-screen bg-[#f7f3ea] px-5 py-8 text-[#2f2a23] sm:px-8 lg:px-12">
      <section className="mx-auto max-w-6xl">
        <header className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Life Cards
            </h1>
            <p className="mt-2 text-sm font-medium uppercase tracking-[0.24em] text-[#8d7f6e]">
              All Cards
            </p>
          </div>

          <Link
            href="/cards/new"
            className="inline-flex w-fit rounded-full bg-[#2f2a23] px-5 py-3 text-sm font-semibold text-[#fffaf0] shadow-lg shadow-[#d5cab8] transition hover:bg-[#4a4034] focus:outline-none focus:ring-2 focus:ring-[#2f2a23] focus:ring-offset-2 focus:ring-offset-[#f7f3ea]"
          >
            ＋ 新しいカード
          </Link>
        </header>

        <CardFirstNav decks={decks} />
        <TradingCardGrid cards={cards} />
      </section>
    </main>
  );
}
