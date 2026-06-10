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
      className="min-w-0 rounded-[18px] border border-[#e8ddcb] bg-[#f8f0e3] p-3 shadow-inner shadow-[#d9cdbb]/25"
      onFocusCapture={onFocus}
    >
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#a19380]">
            Back Memo
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
          className="box-border block min-h-[280px] w-full min-w-0 max-w-full cursor-text resize-y rounded-[16px] border-0 bg-[#fffaf0]/72 px-4 py-4 text-sm leading-6 text-[#332d25] shadow-none outline-none placeholder:text-[#9d917f] focus:bg-[#fffaf0]/90 focus:outline-none focus:ring-0 focus:shadow-none lg:min-h-[360px] xl:min-h-[400px]"
        />
      ) : (
        <>
          <input type="hidden" name="backText" value={backText} />
          <div className="box-border min-h-[280px] w-full min-w-0 max-w-full overflow-y-auto rounded-[16px] border border-[#d8c8aa] bg-white px-4 py-4 shadow-inner shadow-[#d9cdbb]/35 lg:min-h-[360px] xl:min-h-[400px]">
            <MarkdownMemo emptyText="裏面メモを書く（Markdown対応）">
              {backText}
            </MarkdownMemo>
          </div>
        </>
      )}
    </section>
  );
}
