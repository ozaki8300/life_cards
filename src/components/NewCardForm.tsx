"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import MarkdownMemo from "@/components/MarkdownMemo";
import type { Deck } from "@/lib/types";

const imageActions = [
  { id: "photo", label: "写真", draftLabel: "写真" },
  { id: "camera", label: "カメラ", draftLabel: "カメラ" },
  { id: "screenshot", label: "スクショ", draftLabel: "スクショを追加" },
  { id: "book", label: "本", draftLabel: "本を追加" },
  { id: "link", label: "リンク", draftLabel: "リンクを追加" },
];

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

type Props = {
  backHref: string;
  deckId?: string;
  deckName?: string;
  deckOptions?: Deck[];
};

export default function NewCardForm({
  backHref,
  deckId,
  deckName,
  deckOptions = [],
}: Props) {
  const initialDeckId = deckId ?? deckOptions[0]?.id ?? "";
  const [frontText, setFrontText] = useState("");
  const [backText, setBackText] = useState("");
  const [selectedDeckId, setSelectedDeckId] = useState(initialDeckId);
  const [imageLabel, setImageLabel] = useState("");
  const [imagePath, setImagePath] = useState("");
  const [cardDate, setCardDate] = useState(todayInputValue);
  const [isDeckPickerOpen, setIsDeckPickerOpen] = useState(false);
  const [isDeckModalOpen, setIsDeckModalOpen] = useState(false);
  const [backMode, setBackMode] = useState<"edit" | "preview">("edit");
  const [deckSearchQuery, setDeckSearchQuery] = useState("");
  const photoInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const selectedDeckName =
    deckOptions.find((deck) => deck.id === selectedDeckId)?.name ?? deckName ?? "Deck";
  const filteredDeckOptions = deckOptions.filter((deck) =>
    deck.name.toLowerCase().includes(deckSearchQuery.trim().toLowerCase()),
  );

  function applyImageFile(file: File, label: string) {
    const reader = new FileReader();

    reader.addEventListener("load", () => {
      if (typeof reader.result === "string") {
        setImagePath(reader.result);
        setImageLabel(label);
      }
    });

    reader.readAsDataURL(file);
  }

  function handleFileChange(
    event: React.ChangeEvent<HTMLInputElement>,
    label: string,
  ) {
    const file = event.target.files?.[0];

    if (file) {
      applyImageFile(file, label);
    }

    event.target.value = "";
  }

  useEffect(() => {
    function handlePaste(event: ClipboardEvent) {
      const imageItem = Array.from(event.clipboardData?.items ?? []).find((item) =>
        item.type.startsWith("image/"),
      );
      const file = imageItem?.getAsFile();

      if (file) {
        event.preventDefault();
        applyImageFile(file, "貼り付け画像");
      }
    }

    window.addEventListener("paste", handlePaste);

    return () => window.removeEventListener("paste", handlePaste);
  }, []);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const draft = {
      ...Object.fromEntries(formData.entries()),
      imageDataUrl: imagePath,
    };

    console.log("Life Cards draft", draft);
    alert("保存はまだ仮実装です。入力内容を確認しました。");
  }

  function handleCreateDeck(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    console.log("Life Cards deck draft", Object.fromEntries(formData.entries()));
    alert("デッキ作成はまだ仮実装です。");
    setIsDeckModalOpen(false);
  }

  return (
    <main className="min-h-screen bg-[#f7f3ea] px-5 py-5 text-[#2f2a23] sm:px-8 lg:px-10">
      <section className="mx-auto max-w-[1400px]">
        <header className="mb-4 flex items-center justify-between gap-4">
          <Link
            href={backHref}
            className="text-sm font-medium text-[#8d7f6e] transition hover:text-[#2f2a23]"
          >
            Back
          </Link>
          <h1 className="text-lg font-bold tracking-tight sm:text-2xl">
            新しいカード
          </h1>
          <span className="w-10" aria-hidden="true" />
        </header>

        <form
          onSubmit={handleSubmit}
          className="grid gap-5 lg:grid-cols-[380px_minmax(0,1fr)] lg:items-start"
        >
          <input type="hidden" name="deckId" value={selectedDeckId} />
          <input type="hidden" name="imageAction" value={imageLabel} />
          <input type="hidden" name="imagePath" value={imagePath} />

          <section className="space-y-3">
            <div className="mx-auto aspect-[3/4] w-full max-w-[320px] rounded-[22px] border border-[#e8ddcb] bg-[#fffaf0] p-3 shadow-[0_20px_56px_rgba(122,105,82,0.2)]">
              <div className="h-[60%] overflow-hidden rounded-[12px] border border-[#eadfce]/80 bg-[linear-gradient(145deg,#fffaf0,#f1e7d6)]">
                {imagePath ? (
                  <div
                    className="h-full bg-cover bg-center"
                    style={{ backgroundImage: `url(${imagePath})` }}
                  />
                ) : (
                  <div className="flex h-full items-center justify-center px-4 text-center">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#a19380]">
                        {imageLabel || "Photo"}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-[#8d7f6e]">
                        写真・本・リンクの余白
                      </p>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex h-[40%] flex-col justify-between pt-4">
                <p className="line-clamp-3 text-lg font-semibold leading-snug text-[#332d25]">
                  {frontText || "今の気持ちや 大切にしたいこと"}
                </p>
                <div>
                  <p className="text-sm font-semibold text-[#7d705f]">
                    {selectedDeckName}
                  </p>
                  <p className="mt-1 text-[11px] font-medium text-[#a19380]">
                    {cardDate.replaceAll("-", ".")}
                  </p>
                </div>
              </div>
            </div>

            <div className="mx-auto w-full max-w-[320px] rounded-[18px] border border-[#e8ddcb] bg-[#fffaf0] p-3 shadow-[0_14px_36px_rgba(122,105,82,0.13)]">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#a19380]">
                Back
              </p>
              <div className="mt-3 min-h-[88px]">
                <MarkdownMemo compact emptyText="裏面メモを書く">
                  {backText}
                </MarkdownMemo>
              </div>
            </div>
          </section>

          <section className="rounded-[22px] border border-[#e8ddcb] bg-[#fffaf0] p-4 shadow-[0_18px_52px_rgba(122,105,82,0.16)] sm:p-5">
            <div className="grid gap-2">
              <section>
                <div className="grid gap-2.5 sm:grid-cols-2">
                  <label className="block">
                    <input
                      type="date"
                      name="createdAt"
                      aria-label="カードの日付"
                      value={cardDate}
                      onChange={(event) => setCardDate(event.target.value)}
                      className="w-full rounded-[14px] border border-[#e8ddcb] bg-[#f8f0e3] px-3 py-2.5 text-sm font-semibold text-[#332d25] outline-none focus:border-[#cdbda6] focus:ring-2 focus:ring-[#e8ddcb]"
                    />
                  </label>

                  <div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        aria-label="デッキを変更"
                        onClick={() => setIsDeckPickerOpen(true)}
                        className="flex min-w-0 flex-1 items-center justify-between rounded-[14px] border border-[#e8ddcb] bg-[#f8f0e3] px-3 py-2.5 text-left text-sm font-semibold text-[#332d25] transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-[#e8ddcb]"
                      >
                        <span className="truncate">{selectedDeckName}</span>
                        <span className="ml-3 shrink-0 text-xs text-[#8d7f6e]">変更</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsDeckModalOpen(true)}
                        className="shrink-0 rounded-full border border-[#e0d3c0] bg-white/72 px-2.5 py-2 text-[11px] font-semibold text-[#7d705f] transition hover:bg-white"
                      >
                        ＋
                      </button>
                    </div>
                  </div>
                </div>
              </section>

              <section>
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => handleFileChange(event, "写真")}
                />
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(event) => handleFileChange(event, "カメラ")}
                />
                <div className="flex flex-wrap gap-1.5">
                  {imageActions.map((action) => (
                    <button
                      key={action.id}
                      type="button"
                      onClick={() => {
                        if (action.id === "photo") {
                          photoInputRef.current?.click();
                          return;
                        }

                        if (action.id === "camera") {
                          cameraInputRef.current?.click();
                          return;
                        }

                        if (action.id === "screenshot") {
                          setImageLabel(action.label);
                          console.log("draft action", action.draftLabel);
                          alert("PCでは画像をコピーして、この画面で貼り付けてください。");
                          return;
                        }

                        setImageLabel(action.label);
                        console.log("draft action", action.draftLabel);
                      }}
                      className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold shadow-sm transition focus:outline-none focus:ring-2 focus:ring-[#d8c8aa] focus:ring-offset-2 focus:ring-offset-[#fffaf0] ${
                        imageLabel === action.label
                          ? "border-[#2f2a23] bg-[#2f2a23] text-[#fffaf0]"
                          : "border-[#e8ddcb] bg-[#f8f0e3] text-[#5f5346] hover:bg-white"
                      }`}
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              </section>

              <label className="block">
                <textarea
                  name="frontText"
                  rows={3}
                  value={frontText}
                  onChange={(event) => setFrontText(event.target.value)}
                  placeholder="表に残す一言"
                  className="w-full resize-none rounded-[16px] border border-[#eadfce] bg-white/72 px-4 py-2.5 text-base font-semibold leading-6 text-[#332d25] shadow-inner shadow-[#d9cdbb]/30 outline-none placeholder:text-[#9d917f] focus:border-[#cdbda6] focus:ring-2 focus:ring-[#e8ddcb]"
                />
              </label>

              <section className="relative">
                <div className="absolute right-3 top-3 z-10 rounded-full border border-[#e0d3c0] bg-[#f8f0e3]/95 p-1 shadow-sm backdrop-blur">
                  {(["edit", "preview"] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setBackMode(mode)}
                      className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                        backMode === mode
                          ? "bg-[#2f2a23] text-[#fffaf0]"
                          : "text-[#7d705f] hover:bg-white"
                      }`}
                    >
                      {mode === "edit" ? "編集" : "プレビュー"}
                    </button>
                  ))}
                </div>

                {backMode === "edit" ? (
                  <textarea
                    name="backText"
                    rows={14}
                    value={backText}
                    onChange={(event) => setBackText(event.target.value)}
                    placeholder="裏面メモを書く（Markdown対応）"
                    className="min-h-[360px] w-full resize-none rounded-[16px] border border-[#e8ddcb] bg-white/72 px-4 pb-3 pt-14 text-sm leading-6 text-[#332d25] outline-none placeholder:text-[#9d917f] focus:border-[#cdbda6] focus:ring-2 focus:ring-[#e8ddcb] lg:min-h-[400px] xl:min-h-[440px]"
                  />
                ) : (
                  <>
                    <input type="hidden" name="backText" value={backText} />
                    <div className="min-h-[360px] overflow-y-auto rounded-[16px] border border-[#e8ddcb] bg-white/72 px-4 pb-3 pt-14 lg:min-h-[400px] xl:min-h-[440px]">
                      <MarkdownMemo emptyText="裏面メモを書く（Markdown対応）">
                        {backText}
                      </MarkdownMemo>
                    </div>
                  </>
                )}
              </section>

              <button
                type="submit"
                className="mt-1 rounded-full bg-[#2f2a23] px-6 py-3 text-sm font-semibold text-[#fffaf0] shadow-lg shadow-[#d5cab8] transition hover:bg-[#4a4034] focus:outline-none focus:ring-2 focus:ring-[#2f2a23] focus:ring-offset-2 focus:ring-offset-[#fffaf0]"
              >
                保存
              </button>
            </div>
          </section>
        </form>
      </section>

      {isDeckPickerOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#3b3126]/40 px-4 backdrop-blur-sm">
          <button
            type="button"
            aria-label="Close deck picker"
            className="absolute inset-0 cursor-default"
            onClick={() => setIsDeckPickerOpen(false)}
          />
          <section className="relative w-full max-w-md rounded-[20px] border border-[#e8ddcb] bg-[#fffaf0] p-5 shadow-[0_24px_70px_rgba(87,72,52,0.28)]">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-[#332d25]">デッキを選択</h2>
              <button
                type="button"
                onClick={() => setIsDeckPickerOpen(false)}
                className="rounded-full border border-[#e0d3c0] bg-white/72 px-3 py-1 text-sm font-semibold text-[#7d705f]"
              >
                閉じる
              </button>
            </div>
            <input
              value={deckSearchQuery}
              onChange={(event) => setDeckSearchQuery(event.target.value)}
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
                      onClick={() => {
                        setSelectedDeckId(deck.id);
                        setIsDeckPickerOpen(false);
                      }}
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
                onClick={() => {
                  setIsDeckPickerOpen(false);
                  setIsDeckModalOpen(true);
                }}
                className="w-full rounded-[14px] border border-dashed border-[#d8c8aa] bg-white/56 px-4 py-3 text-left text-sm font-semibold text-[#7d705f] transition hover:bg-white"
              >
                ＋ 新しいデッキ
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {isDeckModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#3b3126]/40 px-4 backdrop-blur-sm">
          <button
            type="button"
            aria-label="Close deck dialog"
            className="absolute inset-0 cursor-default"
            onClick={() => setIsDeckModalOpen(false)}
          />
          <form
            onSubmit={handleCreateDeck}
            className="relative w-full max-w-sm rounded-[20px] border border-[#e8ddcb] bg-[#fffaf0] p-5 shadow-[0_24px_70px_rgba(87,72,52,0.28)]"
          >
            <h2 className="text-lg font-bold text-[#332d25]">新しいデッキ</h2>
            <label className="mt-5 block">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#a19380]">
                Deck name
              </span>
              <input
                name="deckName"
                placeholder="娘との思い出"
                className="mt-2 w-full rounded-[14px] border border-[#e8ddcb] bg-white/72 px-4 py-3 text-sm font-semibold text-[#332d25] outline-none placeholder:text-[#a19380] focus:ring-2 focus:ring-[#e8ddcb]"
              />
            </label>
            <div className="mt-5 flex gap-3">
              <button
                type="submit"
                className="flex-1 rounded-full bg-[#2f2a23] px-4 py-2 text-sm font-semibold text-[#fffaf0]"
              >
                作成
              </button>
              <button
                type="button"
                onClick={() => setIsDeckModalOpen(false)}
                className="flex-1 rounded-full border border-[#e0d3c0] bg-white/72 px-4 py-2 text-sm font-semibold text-[#7d705f]"
              >
                閉じる
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </main>
  );
}
