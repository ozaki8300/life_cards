function LoadingSpinner() {
  return (
    <span
      className="h-9 w-9 animate-spin rounded-full border-[3px] border-[#d8c8aa] border-t-[#6f6253]"
      aria-hidden="true"
    />
  );
}

export default function CardsLoading() {
  return (
    <main className="min-h-screen bg-[#f7f3ea] px-5 py-8 text-[#2f2a23] sm:px-8 lg:px-12">
      <section className="mx-auto max-w-6xl">
        <div className="mb-7 flex items-start justify-between gap-3 lg:block">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-[#8d7f6e]">Life Cards</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-[#2f2a23] sm:text-4xl">
              Cards
            </h1>
          </div>
        </div>

        <section>
          <div
            className="flex min-h-[160px] flex-col items-center justify-center gap-4 rounded-[12px] border border-[#e8ddcb] bg-[#fffaf0] p-8 text-center text-sm font-semibold text-[#8d7f6e] shadow-lg shadow-[#d7cab8]"
            role="status"
            aria-live="polite"
          >
            <LoadingSpinner />
            <span>カードを読み込んでいます...</span>
          </div>
        </section>
      </section>
    </main>
  );
}
