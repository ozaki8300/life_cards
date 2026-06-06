"use client";

import Link from "next/link";
import { useState } from "react";

import type { Deck } from "@/lib/types";

const imageActions = [
  "写真を選ぶ",
  "カメラで撮る",
  "本を追加",
  "リンクを追加",
];

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
  const selectedDeckName =
    deckName ?? deckOptions.find((deck) => deck.id === selectedDeckId)?.name ?? "Deck";

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const draft = Object.fromEntries(formData.entries());

    console.log("Life Cards draft", draft);
    alert("保存はまだ仮実装です。入力内容を確認しました。");
  }

  return (
    <main className="min-h-screen bg-[#f7f3ea] px-5 py-6 text-[#2f2a23] sm:px-8 lg:px-12">
      <section className="mx-auto max-w-6xl">
        <header className="mb-6 flex items-center justify-between gap-4">
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
          className="grid gap-7 lg:grid-cols-[minmax(280px,0.9fr)_minmax(0,1.1fr)] lg:items-start"
        >
          {deckId ? <input type="hidden" name="deckId" value={deckId} /> : null}
          <input type="hidden" name="imageAction" value={imageLabel} />

          <section className="space-y-4">
            <div className="mx-auto aspect-[3/4] w-full max-w-[360px] rounded-[24px] border border-[#e8ddcb] bg-[#fffaf0] p-4 shadow-[0_24px_70px_rgba(122,105,82,0.22)]">
              <div className="flex h-[62%] items-center justify-center rounded-[14px] border border-[#eadfce]/80 bg-[linear-gradient(145deg,#fffaf0,#f1e7d6)] px-5 text-center">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#a19380]">
                    {imageLabel || "Photo"}
                  </p>
                  <p className="mt-3 text-sm leading-6 text-[#8d7f6e]">
                    写真・本・リンクの余白
                  </p>
                </div>
              </div>
              <div className="flex h-[38%] flex-col justify-between pt-5">
                <p className="text-xl font-semibold leading-snug text-[#332d25]">
                  {frontText || "今の気持ちや 大切にしたいこと"}
                </p>
                <div>
                  <p className="text-sm font-semibold text-[#7d705f]">
                    {selectedDeckName}
                  </p>
                  <p className="mt-1 text-[11px] font-medium text-[#a19380]">
                    2026.06.06
                  </p>
                </div>
              </div>
            </div>

            <div className="mx-auto w-full max-w-[360px] rounded-[22px] border border-[#e8ddcb] bg-[#fffaf0] p-4 shadow-[0_16px_44px_rgba(122,105,82,0.15)]">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#a19380]">
                Back
              </p>
              <p className="mt-4 min-h-[120px] whitespace-pre-wrap text-base leading-7 text-[#5f5346]">
                {backText || "裏面メモを書く"}
              </p>
            </div>
          </section>

          <section className="rounded-[24px] border border-[#e8ddcb] bg-[#fffaf0] p-5 shadow-[0_18px_52px_rgba(122,105,82,0.16)] sm:p-6">
            <div className="grid gap-5">
              <section>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#a19380]">
                  1 Photo
                </p>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  {imageActions.map((label) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => {
                        setImageLabel(label);
                        console.log("draft action", label);
                      }}
                      className={`rounded-[14px] border px-3 py-4 text-xs font-semibold shadow-sm transition focus:outline-none focus:ring-2 focus:ring-[#2f2a23] ${
                        imageLabel === label
                          ? "border-[#2f2a23] bg-[#2f2a23] text-[#fffaf0]"
                          : "border-[#e8ddcb] bg-[#f8f0e3] text-[#5f5346] hover:bg-white"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => console.log("draft action", "日付を追加")}
                  className="mt-4 rounded-full border border-[#e8ddcb] bg-white/72 px-4 py-2 text-xs font-semibold text-[#8d7f6e] shadow-sm transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-[#2f2a23]"
                >
                  日付を追加
                </button>
              </section>

              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#a19380]">
                  2 Front
                </span>
                <textarea
                  name="frontText"
                  rows={4}
                  value={frontText}
                  onChange={(event) => setFrontText(event.target.value)}
                  placeholder="今の気持ちや 大切にしたいことを 自由に残そう"
                  className="mt-2 w-full resize-none rounded-[16px] border border-[#eadfce] bg-white/72 px-4 py-4 text-lg font-semibold leading-8 text-[#332d25] shadow-inner shadow-[#d9cdbb]/30 outline-none placeholder:text-[#9d917f] focus:border-[#cdbda6] focus:ring-2 focus:ring-[#e8ddcb]"
                />
              </label>

              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#a19380]">
                  3 Back memo
                </span>
                <textarea
                  name="backText"
                  rows={6}
                  value={backText}
                  onChange={(event) => setBackText(event.target.value)}
                  placeholder="裏面メモを書く"
                  className="mt-2 w-full resize-none rounded-[16px] border border-[#e8ddcb] bg-white/72 px-4 py-4 text-base leading-7 text-[#332d25] outline-none placeholder:text-[#9d917f] focus:border-[#cdbda6] focus:ring-2 focus:ring-[#e8ddcb]"
                />
              </label>

              {deckId && deckName ? (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#a19380]">
                    4 Deck
                  </p>
                  <p className="mt-2 rounded-[14px] border border-[#e8ddcb] bg-[#f8f0e3] px-4 py-3 text-sm font-semibold text-[#332d25]">
                    {deckName}
                  </p>
                </div>
              ) : (
                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#a19380]">
                    4 Deck
                  </span>
                  <select
                    name="deckId"
                    value={selectedDeckId}
                    onChange={(event) => setSelectedDeckId(event.target.value)}
                    className="mt-2 w-full rounded-[14px] border border-[#e8ddcb] bg-[#f8f0e3] px-4 py-3 text-sm font-semibold text-[#332d25] outline-none focus:border-[#cdbda6] focus:ring-2 focus:ring-[#e8ddcb]"
                  >
                    {deckOptions.map((deck) => (
                      <option key={deck.id} value={deck.id}>
                        {deck.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              <button
                type="submit"
                className="rounded-full bg-[#2f2a23] px-6 py-3 text-sm font-semibold text-[#fffaf0] shadow-lg shadow-[#d5cab8] transition hover:bg-[#4a4034] focus:outline-none focus:ring-2 focus:ring-[#2f2a23] focus:ring-offset-2 focus:ring-offset-[#fffaf0]"
              >
                保存
              </button>
            </div>
          </section>
        </form>
      </section>
    </main>
  );
}
