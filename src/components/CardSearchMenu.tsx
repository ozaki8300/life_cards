"use client";

const tabs = ["すべて", "お気に入り"];

type Props = {
  activeTab: string;
  onClose: () => void;
  onOpenAbout: () => void;
  onSearchChange?: (query: string) => void;
  onTabChange?: (tab: string) => void;
  searchQuery: string;
};

export default function CardSearchMenu({
  activeTab,
  onClose,
  onOpenAbout,
  onSearchChange,
  onTabChange,
  searchQuery,
}: Props) {
  return (
    <div className="fixed inset-0 z-50 bg-[#3b3126]/40 p-4 backdrop-blur-sm">
      <button
        type="button"
        aria-label="Close deck menu"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />
      <aside className="relative h-full max-w-[340px] rounded-[22px] border border-[#e8ddcb] bg-[#fffaf0] p-4 shadow-[0_24px_70px_rgba(87,72,52,0.28)]">
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#a19380]">
              検索
            </p>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-[#e0d3c0] bg-white/72 px-3 py-1 text-sm font-semibold text-[#7d705f]"
            >
              閉じる
            </button>
          </div>
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => onSearchChange?.(event.target.value)}
            placeholder="カードを検索"
            className="mt-4 w-full rounded-[12px] border border-[#e8ddcb] bg-white/72 px-3 py-2 text-sm text-[#332d25] outline-none placeholder:text-[#a19380] focus:ring-2 focus:ring-[#e8ddcb]"
          />
          <div className="mt-6">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#a19380]">
              表示
            </p>
            <div className="mt-3 space-y-2">
              {tabs.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => onTabChange?.(tab)}
                  className={`block w-full rounded-[14px] border px-4 py-3 text-left text-sm font-semibold transition ${
                    activeTab === tab
                      ? "border-[#2f2a23] bg-[#2f2a23] text-[#fffaf0]"
                      : "border-[#e0d3c0] bg-[#fffaf0]/80 text-[#7d705f] hover:bg-white"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-auto border-t border-[#eadfce] pt-3">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenAbout();
              }}
              className="w-full rounded-[14px] border border-[#e0d3c0] bg-white/72 px-4 py-3 text-left text-sm font-semibold text-[#5f5346] transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-[#d8c8aa]"
            >
              About Life Cards
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}
