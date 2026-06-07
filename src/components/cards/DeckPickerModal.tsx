import type { Deck } from "@/lib/types";

type Props = {
  deckOptions: Deck[];
  deckSearchQuery: string;
  onClose: () => void;
  onCreateDeck: () => void;
  onDeckSearchChange: (query: string) => void;
  onSelectDeck: (deckId: string) => void;
  selectedDeckId: string;
};

export default function DeckPickerModal({
  deckOptions,
  deckSearchQuery,
  onClose,
  onCreateDeck,
  onDeckSearchChange,
  onSelectDeck,
  selectedDeckId,
}: Props) {
  const filteredDeckOptions = deckOptions.filter((deck) =>
    deck.name.toLowerCase().includes(deckSearchQuery.trim().toLowerCase()),
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#3b3126]/40 px-4 backdrop-blur-sm">
      <button
        type="button"
        aria-label="Close deck picker"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />
      <section className="relative w-full max-w-md rounded-[20px] border border-[#e8ddcb] bg-[#fffaf0] p-5 shadow-[0_24px_70px_rgba(87,72,52,0.28)]">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-[#332d25]">デッキを選択</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-[#e0d3c0] bg-white/72 px-3 py-1 text-sm font-semibold text-[#7d705f]"
          >
            閉じる
          </button>
        </div>
        <input
          value={deckSearchQuery}
          onChange={(event) => onDeckSearchChange(event.target.value)}
          placeholder="デッキを検索"
          className="mt-5 w-full rounded-[14px] border border-[#e8ddcb] bg-white/72 px-4 py-3 text-sm font-semibold text-[#332d25] outline-none placeholder:text-[#a19380] focus:border-[#cdbda6] focus:ring-2 focus:ring-[#e8ddcb]"
        />
        <div className="mt-3 max-h-[320px] overflow-y-auto pr-1">
          <div className="grid gap-2">
            {filteredDeckOptions.length > 0 ? (
              filteredDeckOptions.map((deck) => (
                <button
                  key={deck.id}
                  type="button"
                  onClick={() => onSelectDeck(deck.id)}
                  className={`rounded-[14px] border px-4 py-3 text-left text-sm font-semibold transition ${
                    selectedDeckId === deck.id
                      ? "border-[#2f2a23] bg-[#2f2a23] text-[#fffaf0]"
                      : "border-[#e0d3c0] bg-[#f8f0e3] text-[#5f5346] hover:bg-white"
                  }`}
                >
                  {deck.name}
                </button>
              ))
            ) : (
              <p className="rounded-[14px] border border-dashed border-[#d8c8aa] bg-white/56 px-4 py-4 text-sm font-semibold text-[#8d7f6e]">
                該当するデッキがありません
              </p>
            )}
          </div>
        </div>
        <div className="mt-3 border-t border-[#eadfce] pt-3">
          <button
            type="button"
            onClick={onCreateDeck}
            className="w-full rounded-[14px] border border-dashed border-[#d8c8aa] bg-white/56 px-4 py-3 text-left text-sm font-semibold text-[#7d705f] transition hover:bg-white"
          >
            ＋ 新しいデッキ
          </button>
        </div>
      </section>
    </div>
  );
}
