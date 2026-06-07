"use client";

import { useState } from "react";

import type { Card } from "@/lib/types";
import { useEscapeKey } from "@/lib/useEscapeKey";

import { formatDate, gradientFor } from "./cardUiUtils";

export default function CardShareDialog({
  card,
  index,
  onClose,
}: {
  card: Card;
  index: number;
  onClose: () => void;
}) {
  const [copyStatus, setCopyStatus] = useState("");
  useEscapeKey(onClose, { ignoreEditable: false });
  const shareUrl = `https://life-cards.local/share/${card.id}`;
  const qrCells = Array.from({ length: 81 }, (_, cellIndex) => {
    const source = `${card.id}:${cellIndex}`;
    const score = Array.from(source).reduce(
      (total, char, charIndex) => total + char.charCodeAt(0) * (charIndex + 3),
      0,
    );
    const row = Math.floor(cellIndex / 9);
    const col = cellIndex % 9;
    const isFinder =
      (row < 3 && col < 3) ||
      (row < 3 && col > 5) ||
      (row > 5 && col < 3);

    return isFinder || score % 5 < 2;
  });

  async function copyShareUrl() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopyStatus("コピーしました");
    } catch (error) {
      console.warn("Life Cards share URL copy failed", error);
      setCopyStatus("コピーできませんでした");
    }
  }

  async function shareWithOs() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Life Cards",
          text: card.frontText,
          url: shareUrl,
        });
        setCopyStatus("共有シートを開きました");
        return;
      } catch (error) {
        console.warn("Life Cards OS share failed", error);
      }
    }

    await copyShareUrl();
  }

  function saveQrDraft() {
    console.log("Life Cards QR save draft", {
      cardId: card.id,
      shareUrl,
    });
    alert("QR保存はまだ仮実装です。");
  }

  return (
    <div
      className="fixed inset-0 z-20 flex items-center justify-center bg-[#3b3126]/30 px-4 py-6 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-[20px] border border-[#e8ddcb] bg-[#fffaf0] p-5 shadow-[0_28px_80px_rgba(87,72,52,0.3)] sm:p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#a19380]">
              Share
            </p>
            <h2 className="mt-2 text-2xl font-bold text-[#332d25]">
              カードを共有
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-[#e0d3c0] bg-white/72 px-3 py-1 text-sm font-semibold text-[#7d705f] transition hover:bg-white"
          >
            閉じる
          </button>
        </div>

        <div className="mt-5 grid gap-5 sm:grid-cols-[minmax(0,1fr)_180px]">
          <section className="rounded-[16px] border border-[#e8ddcb] bg-[#f8f0e3] p-3">
            <div
              className="overflow-hidden rounded-[14px] border border-[#e0d3c0] bg-[#fffaf0] p-3 shadow-sm"
              style={!card.imagePath ? { background: gradientFor(index) } : undefined}
            >
              {card.imagePath ? (
                <div
                  className="aspect-[4/3] rounded-[10px] bg-cover bg-center"
                  style={{ backgroundImage: `url(${card.imagePath})` }}
                />
              ) : null}
              <h3 className="mt-3 line-clamp-3 text-lg font-semibold leading-snug text-[#332d25]">
                {card.frontText || "Untitled"}
              </h3>
              <p className="mt-2 text-[11px] font-medium text-[#a19380]">
                {formatDate(card.createdAt)}
              </p>
            </div>

            <label className="mt-4 block">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#a19380]">
                共有URL
              </span>
              <input
                readOnly
                value={shareUrl}
                className="mt-2 w-full rounded-[14px] border border-[#e8ddcb] bg-white/72 px-4 py-3 text-sm text-[#5f5346] outline-none focus:ring-2 focus:ring-[#d8c8aa]"
              />
            </label>
            {copyStatus ? (
              <p className="mt-2 text-xs font-semibold text-[#8d7f6e]">
                {copyStatus}
              </p>
            ) : null}
          </section>

          <section className="rounded-[16px] border border-[#e8ddcb] bg-white/70 p-4">
            <div className="grid aspect-square grid-cols-9 gap-1 rounded-[14px] border border-[#e0d3c0] bg-[#fffaf0] p-3">
              {qrCells.map((isFilled, cellIndex) => (
                <span
                  key={`${card.id}-${cellIndex}`}
                  className={`rounded-[2px] ${
                    isFilled ? "bg-[#3b3329]" : "bg-[#efe4d2]"
                  }`}
                />
              ))}
            </div>
            <p className="mt-3 text-center text-xs font-semibold text-[#8d7f6e]">
              QR preview
            </p>
          </section>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-4">
          <button
            type="button"
            onClick={shareWithOs}
            className="rounded-full bg-[#2f2a23] px-4 py-3 text-sm font-semibold text-[#fffaf0] transition hover:bg-[#4a4034]"
          >
            共有する
          </button>
          <button
            type="button"
            onClick={copyShareUrl}
            className="rounded-full border border-[#e0d3c0] bg-white/72 px-4 py-3 text-sm font-semibold text-[#5f5346] transition hover:bg-white"
          >
            URLをコピー
          </button>
          <button
            type="button"
            onClick={saveQrDraft}
            className="rounded-full border border-[#e0d3c0] bg-white/72 px-4 py-3 text-sm font-semibold text-[#5f5346] transition hover:bg-white"
          >
            QRを保存
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-[#e0d3c0] bg-white/72 px-4 py-3 text-sm font-semibold text-[#7d705f] transition hover:bg-white"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}
