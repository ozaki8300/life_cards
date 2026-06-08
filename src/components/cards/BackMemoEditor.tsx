import MarkdownMemo from "@/components/MarkdownMemo";

import type { BackMemoMode } from "./cardFormUtils";

type Props = {
  backMode: BackMemoMode;
  backText: string;
  onBackModeChange: (mode: BackMemoMode) => void;
  onBackTextChange: (value: string) => void;
  onFocus?: () => void;
};

export default function BackMemoEditor({
  backMode,
  backText,
  onBackModeChange,
  onBackTextChange,
  onFocus,
}: Props) {
  return (
    <section
      className="rounded-[18px] border border-[#e8ddcb] bg-[#f8f0e3] p-3 shadow-inner shadow-[#d9cdbb]/25"
      onFocusCapture={onFocus}
    >
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#a19380]">
            Back Memo
          </p>
          <p className="mt-1 text-xs font-medium text-[#9a8d7a]">
            カードの裏面に表示されます
          </p>
        </div>

        <div className="rounded-full border border-[#e0d3c0] bg-[#fffaf0]/95 p-1 shadow-sm backdrop-blur">
          {(["edit", "preview"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => onBackModeChange(mode)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-[#d8c8aa] ${
                backMode === mode
                  ? "bg-[#2f2a23] text-[#fffaf0]"
                  : "text-[#7d705f] hover:bg-white"
              }`}
            >
              {mode === "edit" ? "編集" : "プレビュー"}
            </button>
          ))}
        </div>
      </div>

      {backMode === "edit" ? (
        <textarea
          name="backText"
          rows={14}
          value={backText}
          onChange={(event) => onBackTextChange(event.target.value)}
          placeholder="裏面メモを書く（Markdown対応）"
          className="min-h-[280px] w-full cursor-text resize-y rounded-[16px] border border-[#d8c8aa] bg-white px-4 py-4 text-sm leading-6 text-[#332d25] shadow-inner shadow-[#d9cdbb]/35 outline-none placeholder:text-[#9d917f] focus:border-[#c5ad8d] focus:ring-2 focus:ring-[#e0d3c0] lg:min-h-[360px] xl:min-h-[400px]"
        />
      ) : (
        <>
          <input type="hidden" name="backText" value={backText} />
          <div className="min-h-[280px] overflow-y-auto rounded-[16px] border border-[#d8c8aa] bg-white px-4 py-4 shadow-inner shadow-[#d9cdbb]/35 lg:min-h-[360px] xl:min-h-[400px]">
            <MarkdownMemo emptyText="裏面メモを書く（Markdown対応）">
              {backText}
            </MarkdownMemo>
          </div>
        </>
      )}
    </section>
  );
}
