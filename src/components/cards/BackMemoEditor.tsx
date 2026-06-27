import MarkdownMemo from "@/components/MarkdownMemo";
import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";

import type { BackMemoMode } from "./cardFormUtils";

const COPY_STATUS_RESET_MS = 1800;

type Props = {
  backMode: BackMemoMode;
  backText: string;
  onBackModeChange: (mode: BackMemoMode) => void;
  onBackTextChange: (value: string) => void;
  onFocus?: () => void;
};

function restoreTextareaSelection(
  textarea: HTMLTextAreaElement,
  selectionStart: number,
  selectionEnd = selectionStart,
) {
  requestAnimationFrame(() => {
    textarea.setSelectionRange(selectionStart, selectionEnd);
  });
}

export default function BackMemoEditor({
  backMode,
  backText,
  onBackModeChange,
  onBackTextChange,
  onFocus,
}: Props) {
  const [copyStatus, setCopyStatus] = useState("");
  const copyStatusResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  useEffect(() => {
    return () => {
      if (copyStatusResetTimerRef.current) {
        clearTimeout(copyStatusResetTimerRef.current);
        copyStatusResetTimerRef.current = null;
      }
    };
  }, []);

  function clearCopyStatusResetTimer() {
    if (copyStatusResetTimerRef.current) {
      clearTimeout(copyStatusResetTimerRef.current);
      copyStatusResetTimerRef.current = null;
    }
  }

  function showCopyStatus(message: string) {
    clearCopyStatusResetTimer();
    setCopyStatus(message);
    copyStatusResetTimerRef.current = setTimeout(() => {
      setCopyStatus("");
      copyStatusResetTimerRef.current = null;
    }, COPY_STATUS_RESET_MS);
  }

  async function handleCopyBackMemo() {
    try {
      await navigator.clipboard.writeText(backText);
      showCopyStatus("コピーしました");
    } catch (error) {
      console.warn("Life Cards Back Memo copy failed", error);
      showCopyStatus("コピーできませんでした");
    }
  }

  function handleClearBackMemo() {
    const confirmed = window.confirm("本当にBack Memoを削除しますか？");

    if (!confirmed) {
      return;
    }

    onBackTextChange("");
    setCopyStatus("");
    clearCopyStatusResetTimer();
  }

  function handleBackTextKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.nativeEvent.isComposing || event.key === "Process") {
      return;
    }

    const textarea = event.currentTarget;
    const { selectionStart, selectionEnd, value } = textarea;

    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "b") {
      event.preventDefault();

      const selectedText = value.slice(selectionStart, selectionEnd);
      const replacement = selectedText ? `**${selectedText}**` : "****";

      textarea.setRangeText(
        replacement,
        selectionStart,
        selectionEnd,
        "end",
      );

      const nextCursorPosition = selectedText
        ? selectionStart + replacement.length
        : selectionStart + 2;

      onBackTextChange(textarea.value);
      restoreTextareaSelection(textarea, nextCursorPosition);
      return;
    }

    if (event.key !== "Enter" || selectionStart !== selectionEnd) {
      return;
    }

    const lineStart = value.lastIndexOf("\n", selectionStart - 1) + 1;
    const nextLineBreak = value.indexOf("\n", selectionStart);
    const lineEnd = nextLineBreak === -1 ? value.length : nextLineBreak;
    const currentLine = value.slice(lineStart, lineEnd);
    const lineBeforeCursor = value.slice(lineStart, selectionStart);
    const emptyListItemMatch = currentLine.match(/^(\s*)-\s*$/);

    if (emptyListItemMatch && selectionStart >= lineEnd) {
      event.preventDefault();
      textarea.setRangeText("", lineStart, lineEnd, "start");
      onBackTextChange(textarea.value);
      restoreTextareaSelection(textarea, lineStart);
      return;
    }

    const listItemMatch = lineBeforeCursor.match(/^(\s*)-\s+\S/);

    if (!listItemMatch) {
      return;
    }

    event.preventDefault();

    const indentation = listItemMatch[1] ?? "";
    const insertion = `\n${indentation}- `;

    textarea.setRangeText(insertion, selectionStart, selectionEnd, "end");
    onBackTextChange(textarea.value);
    restoreTextareaSelection(textarea, selectionStart + insertion.length);
  }

  return (
    <section
      className="min-w-0 rounded-[16px] border border-[#e8ddcb] bg-[#fbf4e8] p-2.5 shadow-inner shadow-[#d9cdbb]/10 sm:p-3"
      onFocusCapture={onFocus}
    >
      <div className="mb-2 flex items-center justify-between gap-2 sm:mb-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <p className="shrink-0 text-xs font-semibold uppercase tracking-[0.18em] text-[#a19380]">
            Back Memo
          </p>
          <div className="hidden min-w-0 items-center gap-1 sm:flex">
            <button
              type="button"
              onClick={handleCopyBackMemo}
              className="inline-flex min-h-8 items-center justify-center rounded-full border border-[#e0d3c0] bg-[#fffaf0]/72 px-2.5 py-1.5 text-xs font-semibold text-[#6f6253] transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-[#d8c8aa]"
            >
              コピー
            </button>
            <button
              type="button"
              disabled={!backText}
              onClick={handleClearBackMemo}
              className="inline-flex min-h-8 items-center justify-center rounded-full border border-[#ead7c8] bg-[#fffaf0]/52 px-2.5 py-1.5 text-xs font-semibold text-[#8a6254] transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-[#d8c8aa] disabled:cursor-not-allowed disabled:opacity-45"
            >
              クリア
            </button>
            {copyStatus ? (
              <span
                aria-live="polite"
                className="text-xs font-semibold text-[#7d705f]"
              >
                {copyStatus}
              </span>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1 rounded-full border border-[#e0d3c0] bg-[#fffaf0]/86 p-1 shadow-sm backdrop-blur">
          {(["edit", "preview"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => onBackModeChange(mode)}
              className={`rounded-full px-2.5 py-1 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-[#d8c8aa] sm:px-3 ${
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
      <div className="mb-2 flex items-center gap-2 sm:hidden">
        <button
          type="button"
          onClick={handleCopyBackMemo}
          className="inline-flex min-h-8 items-center justify-center rounded-full border border-[#e0d3c0] bg-[#fffaf0]/72 px-2.5 py-1.5 text-xs font-semibold text-[#6f6253] transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-[#d8c8aa]"
        >
          コピー
        </button>
        <button
          type="button"
          disabled={!backText}
          onClick={handleClearBackMemo}
          className="inline-flex min-h-8 items-center justify-center rounded-full border border-[#ead7c8] bg-[#fffaf0]/52 px-2.5 py-1.5 text-xs font-semibold text-[#8a6254] transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-[#d8c8aa] disabled:cursor-not-allowed disabled:opacity-45"
        >
          クリア
        </button>
        {copyStatus ? (
          <span aria-live="polite" className="text-xs font-semibold text-[#7d705f]">
            {copyStatus}
          </span>
        ) : null}
      </div>

      {backMode === "edit" ? (
        <textarea
          name="backText"
          rows={22}
          value={backText}
          onChange={(event) => onBackTextChange(event.target.value)}
          onKeyDown={handleBackTextKeyDown}
          placeholder="裏面メモを書く（Markdown対応）"
          className="card-detail-back-scroll box-border block min-h-[540px] w-full min-w-0 max-w-full cursor-text resize-y rounded-[12px] border border-[#eadcc8]/75 bg-[#fffdf8] px-4 py-4 text-[15px] leading-[1.7] text-[#332d25] shadow-none outline-none placeholder:text-[#9d917f] focus:border-[#cdbda7]/80 focus:bg-[#fffdf8] focus:outline-none focus:ring-1 focus:ring-inset focus:ring-[#d8c8aa]/45 focus:shadow-none sm:min-h-[640px] sm:px-7 sm:py-6 sm:text-base sm:leading-7 lg:min-h-[64vh] xl:min-h-[70vh]"
        />
      ) : (
        <>
          <input type="hidden" name="backText" value={backText} />
          <div className="card-detail-back-scroll box-border min-h-[540px] w-full min-w-0 max-w-full overflow-y-auto rounded-[12px] border border-[#eadcc8]/75 bg-[#fffdf8] px-4 py-4 shadow-none sm:min-h-[640px] sm:px-7 sm:py-6 lg:min-h-[64vh] xl:min-h-[70vh]">
            <MarkdownMemo emptyText="裏面メモを書く（Markdown対応）">
              {backText}
            </MarkdownMemo>
          </div>
        </>
      )}
    </section>
  );
}
