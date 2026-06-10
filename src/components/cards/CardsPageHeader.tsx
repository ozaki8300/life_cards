import Link from "next/link";

type Props = {
  cardCount?: number;
  deckName?: string;
};

export default function CardsPageHeader({ cardCount, deckName }: Props) {
  const isDeckPage = Boolean(deckName);

  return (
    <header className="mb-7">
      <div>
        <Link href="/" className="inline-block transition hover:opacity-75">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Life Cards
          </h1>
        </Link>
        {isDeckPage ? (
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <p className="text-sm font-medium text-[#8d7f6e]">
              {deckName}
              {typeof cardCount === "number" ? ` ・ ${cardCount} cards` : ""}
            </p>
            <Link
              href="/cards"
              className="inline-flex rounded-full border border-[#e0d3c0] bg-[#fffaf0]/72 px-3 py-1 text-xs font-semibold text-[#7d705f] transition hover:bg-white hover:text-[#2f2a23] focus:outline-none focus:ring-2 focus:ring-[#d8c8aa]"
            >
              ← All Cards
            </Link>
          </div>
        ) : (
          <p className="mt-2 text-sm font-medium uppercase tracking-[0.24em] text-[#8d7f6e]">
            REENCOUNTER HOME
          </p>
        )}
      </div>
    </header>
  );
}
