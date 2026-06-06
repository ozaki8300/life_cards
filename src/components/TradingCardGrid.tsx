"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import MarkdownMemo from "@/components/MarkdownMemo";
import type { Card, Deck } from "@/lib/types";

type Props = {
  cards: Card[];
  decks?: Deck[];
  favoriteIds?: string[];
  layout?: "grid" | "rail";
  onToggleFavorite?: (cardId: string) => void;
};

const gradients = [
  "linear-gradient(145deg, #fffaf0 0%, #f3eadc 100%)",
  "linear-gradient(145deg, #fff8ea 0%, #edf4eb 100%)",
  "linear-gradient(145deg, #fff7ec 0%, #f4eddf 100%)",
];

function gradientFor(index: number) {
  return gradients[index % gradients.length];
}

function formatDate(date: string) {
  return date.replaceAll("-", ".");
}

function isEditableElement(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return Boolean(target.closest("input, textarea, select, [contenteditable='true']"));
}

function CardTile({
  card,
  index,
  isBack,
  isFavorite,
  onFlip,
  onOpen,
  onToggleFavorite,
}: {
  card: Card;
  index: number;
  isBack: boolean;
  isFavorite: boolean;
  onFlip: () => void;
  onOpen: () => void;
  onToggleFavorite: () => void;
}) {
  const hasImage = Boolean(card.imagePath);
  const frontTitle = card.frontText || "Untitled";
  const backTitle = card.backText || "No back text";
  const date = formatDate(card.createdAt);

  return (
    <article
      onClick={onFlip}
      className="group relative aspect-[3/4] cursor-pointer rounded-[14px] transition duration-200 [perspective:1000px] hover:-translate-y-1 focus-within:ring-2 focus-within:ring-[#d8c8aa] focus-within:ring-offset-2 focus-within:ring-offset-[#fffaf0]"
    >
      <div
        className={`absolute inset-0 rounded-[14px] transition-transform duration-500 ease-out [transform-style:preserve-3d] motion-reduce:transition-none ${
          isBack ? "[transform:rotateY(180deg)]" : ""
        }`}
      >
        <div
          className="absolute inset-0 overflow-hidden rounded-[14px] border border-[#e8ddcb] bg-[#fffaf0] p-3 shadow-[0_14px_34px_rgba(122,105,82,0.16)] [backface-visibility:hidden] group-hover:shadow-[0_18px_42px_rgba(122,105,82,0.22)]"
          style={!hasImage ? { background: gradientFor(index) } : undefined}
        >
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.28),transparent_38%,rgba(88,72,52,0.035))]" />

          <div className="relative flex h-full flex-col">
            {hasImage ? (
              <div
                className="h-[62%] rounded-[8px] bg-cover bg-center shadow-inner shadow-[#9c8f7c]/20 transition duration-300 group-hover:scale-[1.01]"
                style={{ backgroundImage: `url(${card.imagePath})` }}
              />
            ) : (
              <div className="flex h-[62%] items-center justify-center rounded-[8px] border border-[#eadfce]/70 bg-[#fffaf0]/42 px-4 text-center">
                <p className="text-xl font-semibold leading-snug text-[#332d25]">
                  {frontTitle}
                </p>
              </div>
            )}

            <div className="flex flex-1 flex-col justify-between pt-4">
              <h2 className="line-clamp-3 text-base font-semibold leading-snug text-[#332d25]">
                {frontTitle}
              </h2>
              <div>
                {card.backText ? (
                  <p className="mt-3 line-clamp-1 text-xs leading-5 text-[#8d7f6e]">
                    {card.backText}
                  </p>
                ) : null}
                <p className="mt-2 text-[11px] font-medium text-[#a19380]">
                  {date}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div
          className="absolute inset-0 overflow-hidden rounded-[14px] border border-[#e8ddcb] bg-[#fffaf0] p-3 shadow-[0_14px_34px_rgba(122,105,82,0.16)] [backface-visibility:hidden] [transform:rotateY(180deg)] group-hover:shadow-[0_18px_42px_rgba(122,105,82,0.22)]"
          style={!hasImage ? { background: gradientFor(index) } : undefined}
        >
          {hasImage ? (
            <div
              className="absolute inset-0 bg-cover bg-center opacity-15 blur-[1px]"
              style={{ backgroundImage: `url(${card.imagePath})` }}
            />
          ) : null}
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.28),transparent_38%,rgba(88,72,52,0.035))]" />

          <div className="relative flex h-full flex-col justify-center rounded-[10px] border border-[#eadfce]/70 bg-[#fffaf0]/86 px-4 py-6">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#a19380]">
              Memo
            </p>
            <h2 className="mt-4 text-lg font-semibold leading-relaxed text-[#332d25]">
              {backTitle}
            </h2>
            {card.frontText ? (
              <p className="mt-4 line-clamp-3 text-xs leading-5 text-[#8d7f6e]">
                {card.frontText}
              </p>
            ) : null}
            <p className="mt-5 text-[11px] font-medium text-[#a19380]">
              {date}
            </p>
          </div>
        </div>
      </div>

      <button
        type="button"
        aria-label="Open card detail"
        onClick={(event) => {
          event.stopPropagation();
          onOpen();
        }}
        className="absolute right-5 top-5 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-[#e0d3c0] bg-[#fffaf0]/88 text-lg font-semibold leading-none text-[#7d705f] shadow-sm backdrop-blur transition hover:bg-white hover:text-[#2f2a23] focus:outline-none focus:ring-2 focus:ring-[#2f2a23]"
      >
        ...
      </button>

      <button
        type="button"
        aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
        aria-pressed={isFavorite}
        onClick={(event) => {
          event.stopPropagation();
          onToggleFavorite();
        }}
        className={`absolute bottom-5 right-5 z-10 flex h-9 w-9 items-center justify-center rounded-full border text-lg leading-none shadow-sm backdrop-blur transition focus:outline-none focus:ring-2 focus:ring-[#d8c8aa] focus:ring-offset-2 focus:ring-offset-[#fffaf0] ${
          isFavorite
            ? "border-[#d8b456] bg-[#fff4c7]/92 text-[#8a6410] hover:bg-[#ffef9c]"
            : "border-[#e0d3c0] bg-[#fffaf0]/88 text-[#a19380] hover:bg-white hover:text-[#2f2a23]"
        }`}
      >
        {isFavorite ? "★" : "☆"}
      </button>

    </article>
  );
}

function ModalCard({
  card,
  index,
  isFavorite,
  hasMultipleCards,
  onClose,
  onDelete,
  onEdit,
  onNext,
  onPrevious,
  onShare,
  onToggleFavorite,
}: {
  card: Card;
  index: number;
  isFavorite: boolean;
  hasMultipleCards: boolean;
  onClose: () => void;
  onDelete: () => void;
  onEdit: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onShare: () => void;
  onToggleFavorite: () => void;
}) {
  const hasImage = Boolean(card.imagePath);
  const actionButtons = (
    <>
      <button
        type="button"
        onClick={onPrevious}
        disabled={!hasMultipleCards}
        className="rounded-full border border-[#e0d3c0] bg-white/72 px-4 py-2 text-sm font-semibold text-[#7d705f] transition hover:bg-white disabled:opacity-35"
      >
        前へ
      </button>
      <button
        type="button"
        onClick={onNext}
        disabled={!hasMultipleCards}
        className="rounded-full border border-[#e0d3c0] bg-white/72 px-4 py-2 text-sm font-semibold text-[#7d705f] transition hover:bg-white disabled:opacity-35"
      >
        次へ
      </button>
      <button
        type="button"
        onClick={onEdit}
        className="rounded-full border border-[#e0d3c0] bg-white/72 px-4 py-2 text-sm font-semibold text-[#5f5346] transition hover:bg-white"
      >
        編集
      </button>
      <button
        type="button"
        onClick={onDelete}
        className="rounded-full border border-[#e6c9be] bg-[#fff4ef] px-4 py-2 text-sm font-semibold text-[#9b4b35] transition hover:bg-white"
      >
        削除
      </button>
      <button
        type="button"
        onClick={onToggleFavorite}
        className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
          isFavorite
            ? "border-[#d8b456] bg-[#fff4c7] text-[#8a6410]"
            : "border-[#e0d3c0] bg-white/72 text-[#7d705f] hover:bg-white"
        }`}
      >
        {isFavorite ? "★ お気に入り" : "☆ お気に入り"}
      </button>
      <button
        type="button"
        onClick={onShare}
        className="rounded-full border border-[#e0d3c0] bg-white/72 px-4 py-2 text-sm font-semibold text-[#5f5346] transition hover:bg-white"
      >
        QR共有
      </button>
      <button
        type="button"
        onClick={onClose}
        className="rounded-full border border-[#e0d3c0] bg-white/72 px-4 py-2 text-sm font-semibold text-[#7d705f] transition hover:bg-white"
      >
        閉じる
      </button>
    </>
  );

  return (
    <div className="mx-auto w-full max-w-6xl overflow-hidden rounded-[18px] border border-[#e8ddcb] bg-[#fffaf0] shadow-[0_28px_80px_rgba(87,72,52,0.28)]">
      <div className="grid md:grid-cols-[minmax(0,0.58fr)_minmax(360px,0.42fr)]">
        <section
          className="relative flex min-h-[300px] overflow-hidden bg-cover bg-center md:min-h-[680px]"
          style={
            hasImage
              ? { backgroundImage: `url(${card.imagePath})` }
              : { background: gradientFor(index) }
          }
        >
          <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(255,250,240,0.22),rgba(255,250,240,0.03))]" />
          {!hasImage ? (
            <div className="relative m-auto flex aspect-[3/4] w-[58%] max-w-[300px] flex-col justify-between rounded-[16px] border border-[#eadfce]/80 bg-[#fffaf0]/72 p-5 text-center shadow-[0_18px_42px_rgba(122,105,82,0.16)] backdrop-blur">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#a19380]">
                Life Cards
              </p>
              <p className="px-2 text-2xl font-semibold leading-snug text-[#332d25]">
                {card.frontText || "Untitled"}
              </p>
              <p className="text-[11px] font-medium text-[#a19380]">
                {formatDate(card.createdAt)}
              </p>
            </div>
          ) : null}
        </section>

        <section className="flex min-h-[520px] flex-col p-5 sm:p-6 md:min-h-[680px]">
          <p className="w-fit rounded-full border border-[#e0d3c0] bg-[#f8f0e3] px-3 py-1 text-[11px] font-semibold tracking-[0.16em] text-[#8d7f6e]">
            {formatDate(card.createdAt)}
          </p>

          <h2 className="mt-4 text-3xl font-semibold leading-tight text-[#332d25]">
            {card.frontText || "Untitled"}
          </h2>

          <section className="mt-5 min-h-[280px] flex-1 overflow-y-auto rounded-[14px] border border-[#e8ddcb] bg-[#f8f0e3] p-5 sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#a19380]">
              Back
            </p>
            <div className="mt-4">
              <MarkdownMemo>{card.backText || ""}</MarkdownMemo>
            </div>
          </section>

          <section className="mt-5 grid grid-cols-2 gap-3">
            {actionButtons}
          </section>
        </section>
      </div>
    </div>
  );
}

function ShareCardDialog({
  card,
  index,
  onClose,
}: {
  card: Card;
  index: number;
  onClose: () => void;
}) {
  const [copyStatus, setCopyStatus] = useState("");
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

function EditCardDialog({
  card,
  decks,
  onClose,
}: {
  card: Card;
  decks: Deck[];
  onClose: () => void;
}) {
  const [imagePath, setImagePath] = useState(card.imagePath ?? "");
  const imageInputRef = useRef<HTMLInputElement>(null);

  const applyImageFile = useCallback((file: File) => {
    const reader = new FileReader();

    reader.addEventListener("load", () => {
      if (typeof reader.result === "string") {
        setImagePath(reader.result);
      }
    });

    reader.readAsDataURL(file);
  }, []);

  useEffect(() => {
    function handlePaste(event: ClipboardEvent) {
      const imageItem = Array.from(event.clipboardData?.items ?? []).find((item) =>
        item.type.startsWith("image/"),
      );
      const file = imageItem?.getAsFile();

      if (file) {
        event.preventDefault();
        applyImageFile(file);
      }
    }

    window.addEventListener("paste", handlePaste);

    return () => window.removeEventListener("paste", handlePaste);
  }, [applyImageFile]);

  function logImageAction(action: string) {
    console.log("Life Cards image edit draft", {
      action,
      cardId: card.id,
      imagePath,
    });
    alert(`${action} はまだ仮実装です。`);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    console.log("Life Cards edit draft", {
      ...Object.fromEntries(formData.entries()),
      imagePath,
      imageDataUrl: imagePath,
    });
    alert("編集保存はまだ仮実装です。入力内容を確認しました。");
    onClose();
  }

  return (
    <div className="mx-auto max-h-[calc(100vh-48px)] w-full max-w-2xl overflow-y-auto rounded-[18px] border border-[#e8ddcb] bg-[#fffaf0] p-5 shadow-[0_28px_80px_rgba(87,72,52,0.28)] sm:p-6">
      <div className="mb-5 flex items-center justify-between gap-4">
        <h2 className="text-xl font-bold text-[#332d25]">カードを編集</h2>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full border border-[#e0d3c0] bg-white/72 px-3 py-1 text-sm font-semibold text-[#7d705f]"
        >
          閉じる
        </button>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-5 pb-3">
        <input type="hidden" name="imagePath" value={imagePath} />

        <section className="rounded-[16px] border border-[#e8ddcb] bg-[#f8f0e3] p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#a19380]">
            Image
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-[180px_minmax(0,1fr)]">
            {imagePath ? (
              <div
                className="aspect-[4/3] rounded-[12px] border border-[#e0d3c0] bg-cover bg-center shadow-inner shadow-[#9c8f7c]/20"
                style={{ backgroundImage: `url(${imagePath})` }}
              />
            ) : (
              <div className="flex aspect-[4/3] items-center justify-center rounded-[12px] border border-dashed border-[#d8c8aa] bg-[#fffaf0] px-4 text-center">
                <p className="text-sm font-semibold leading-6 text-[#8d7f6e]">
                  紙カード風プレースホルダー
                </p>
              </div>
            )}

            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];

                if (file) {
                  applyImageFile(file);
                }

                event.target.value = "";
              }}
            />

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  logImageAction("写真を変更");
                  imageInputRef.current?.click();
                }}
                className="rounded-[14px] border border-[#e0d3c0] bg-white/72 px-3 py-3 text-xs font-semibold text-[#5f5346] transition hover:bg-white"
              >
                写真を変更
              </button>
              <button
                type="button"
                onClick={() => setImagePath("")}
                className="rounded-[14px] border border-[#e6c9be] bg-[#fff4ef] px-3 py-3 text-xs font-semibold text-[#9b4b35] transition hover:bg-white"
              >
                画像を削除
              </button>
              <button
                type="button"
                onClick={() => logImageAction("本を追加")}
                className="rounded-[14px] border border-[#e0d3c0] bg-white/72 px-3 py-3 text-xs font-semibold text-[#5f5346] transition hover:bg-white"
              >
                本を追加
              </button>
              <button
                type="button"
                onClick={() => logImageAction("リンクを追加")}
                className="rounded-[14px] border border-[#e0d3c0] bg-white/72 px-3 py-3 text-xs font-semibold text-[#5f5346] transition hover:bg-white"
              >
                リンクを追加
              </button>
            </div>
          </div>
        </section>

        <label>
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#a19380]">
            Front
          </span>
          <textarea
            name="frontText"
            defaultValue={card.frontText}
            rows={3}
            className="mt-2 w-full resize-none rounded-[14px] border border-[#e8ddcb] bg-white/72 px-4 py-3 text-base text-[#332d25] outline-none focus:ring-2 focus:ring-[#e8ddcb]"
          />
        </label>

        <label>
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#a19380]">
            Back
          </span>
          <textarea
            name="backText"
            defaultValue={card.backText}
            rows={5}
            className="mt-2 w-full resize-none rounded-[14px] border border-[#e8ddcb] bg-white/72 px-4 py-3 text-base text-[#332d25] outline-none focus:ring-2 focus:ring-[#e8ddcb]"
          />
        </label>

        <section className="mt-2 rounded-[16px] border border-[#e8ddcb] bg-[#f8f0e3] p-4">
          <div className="grid gap-5 sm:grid-cols-2">
            <label>
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#a19380]">
                Deck
              </span>
              <select
                name="deckId"
                defaultValue={card.deckId}
                className="mt-3 w-full rounded-[14px] border border-[#e8ddcb] bg-[#fffaf0] px-4 py-3 text-sm font-semibold text-[#332d25] outline-none focus:ring-2 focus:ring-[#e8ddcb]"
              >
                {decks.map((deck) => (
                  <option key={deck.id} value={deck.id}>
                    {deck.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#a19380]">
                Date
              </span>
              <input
                type="date"
                name="createdAt"
                defaultValue={card.createdAt}
                className="mt-3 w-full rounded-[14px] border border-[#e8ddcb] bg-[#fffaf0] px-4 py-3 text-sm font-semibold text-[#332d25] outline-none focus:ring-2 focus:ring-[#e8ddcb]"
              />
            </label>
          </div>
        </section>

        <button
          type="submit"
          className="mt-3 rounded-full bg-[#2f2a23] px-6 py-3 text-sm font-semibold text-[#fffaf0] shadow-lg shadow-[#d5cab8] transition hover:bg-[#4a4034]"
        >
          保存
        </button>
      </form>
    </div>
  );
}

export default function TradingCardGrid({
  cards,
  decks = [],
  favoriteIds,
  layout = "grid",
  onToggleFavorite,
}: Props) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [flippedIds, setFlippedIds] = useState<Set<string>>(new Set());
  const [isEditing, setIsEditing] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [localFavoriteIds, setLocalFavoriteIds] = useState<Set<string>>(
    () =>
      new Set(
        cards.filter((card) => card.isFavorite).map((card) => card.id),
      ),
  );
  const activeFavoriteIds = favoriteIds
    ? new Set(favoriteIds)
    : localFavoriteIds;
  const selectedCard = selectedIndex === null ? null : cards[selectedIndex];
  const hasMultipleCards = cards.length > 1;

  const showCard = useCallback(
    (nextIndex: number) => {
      const boundedIndex = (nextIndex + cards.length) % cards.length;
      setSelectedIndex(boundedIndex);
      setIsEditing(false);
      setIsSharing(false);
    },
    [cards.length],
  );

  const showPrevious = useCallback(() => {
    if (hasMultipleCards && selectedIndex !== null) {
      showCard(selectedIndex - 1);
    }
  }, [hasMultipleCards, selectedIndex, showCard]);

  const showNext = useCallback(() => {
    if (hasMultipleCards && selectedIndex !== null) {
      showCard(selectedIndex + 1);
    }
  }, [hasMultipleCards, selectedIndex, showCard]);

  const closePreview = useCallback(() => {
    setSelectedIndex(null);
    setIsEditing(false);
    setIsSharing(false);
  }, []);

  useEffect(() => {
    if (selectedIndex === null) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (isSharing) {
        if (event.key === "Escape") {
          event.preventDefault();
          setIsSharing(false);
        }

        return;
      }

      if (isEditing || isEditableElement(event.target)) {
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        closePreview();
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        showPrevious();
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        showNext();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [closePreview, isEditing, isSharing, selectedIndex, showNext, showPrevious]);

  function toggleCard(cardId: string) {
    setFlippedIds((current) => {
      const next = new Set(current);

      if (next.has(cardId)) {
        next.delete(cardId);
      } else {
        next.add(cardId);
      }

      return next;
    });
  }

  function toggleFavorite(cardId: string) {
    if (onToggleFavorite) {
      onToggleFavorite(cardId);
      return;
    }

    setLocalFavoriteIds((current) => {
      const next = new Set(current);

      if (next.has(cardId)) {
        next.delete(cardId);
      } else {
        next.add(cardId);
      }

      return next;
    });
  }

  function deleteCard(card: Card) {
    if (window.confirm("このカードを削除しますか？")) {
      console.log("Life Cards delete draft", card.id);
      alert("削除はまだ仮実装です。");
    }
  }

  function handleTouchEnd(touchEndX: number) {
    if (touchStartX === null || isEditing || isSharing) {
      return;
    }

    const deltaX = touchEndX - touchStartX;

    if (Math.abs(deltaX) < 50) {
      setTouchStartX(null);
      return;
    }

    if (deltaX < 0) {
      showNext();
    } else {
      showPrevious();
    }

    setTouchStartX(null);
  }

  if (cards.length === 0) {
    return (
      <div className="rounded-[12px] border border-[#e8ddcb] bg-[#fffaf0] p-8 text-sm text-[#8d7f6e] shadow-lg shadow-[#d7cab8]">
        No cards yet.
      </div>
    );
  }

  return (
    <>
      <div
        className={
          layout === "rail"
            ? "inline-grid w-fit max-w-full grid-cols-[repeat(2,minmax(0,11rem))] justify-start gap-5 sm:grid-cols-[repeat(3,minmax(0,12rem))] md:grid-cols-[repeat(4,minmax(0,12rem))] xl:grid-cols-[repeat(5,minmax(0,12rem))]"
            : "grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4"
        }
      >
        {cards.map((card, index) => (
          <CardTile
            key={card.id}
            card={card}
            index={index}
            isBack={flippedIds.has(card.id)}
            isFavorite={activeFavoriteIds.has(card.id)}
            onFlip={() => toggleCard(card.id)}
            onOpen={() => setSelectedIndex(index)}
            onToggleFavorite={() => toggleFavorite(card.id)}
          />
        ))}
      </div>

      {selectedCard && selectedIndex !== null ? (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-[#3b3126]/45 px-4 py-6 backdrop-blur-md sm:px-6"
          onTouchStart={(event) => setTouchStartX(event.changedTouches[0].clientX)}
          onTouchEnd={(event) => handleTouchEnd(event.changedTouches[0].clientX)}
        >
          <button
            type="button"
            aria-label="Close card preview"
            className="fixed inset-0 cursor-default"
            onClick={closePreview}
          />

          <div className="relative mx-auto flex min-h-full max-w-6xl items-center">
            <button
              type="button"
              onClick={showPrevious}
              disabled={!hasMultipleCards}
              aria-label="Previous card"
              className="fixed left-3 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-[#e0d3c0] bg-[#fffaf0]/88 text-2xl font-light text-[#7d705f] shadow-lg transition hover:bg-white hover:text-[#2f2a23] disabled:opacity-25 sm:left-6"
            >
              ‹
            </button>

            <div className="relative w-full">
              {isEditing ? (
                <EditCardDialog
                  card={selectedCard}
                  decks={decks}
                  onClose={() => setIsEditing(false)}
                />
              ) : (
                <ModalCard
                  card={selectedCard}
                  index={selectedIndex}
                  isFavorite={activeFavoriteIds.has(selectedCard.id)}
                  hasMultipleCards={hasMultipleCards}
                  onClose={closePreview}
                  onDelete={() => deleteCard(selectedCard)}
                  onEdit={() => setIsEditing(true)}
                  onNext={showNext}
                  onPrevious={showPrevious}
                  onShare={() => setIsSharing(true)}
                  onToggleFavorite={() => toggleFavorite(selectedCard.id)}
                />
              )}
            </div>

            <button
              type="button"
              onClick={showNext}
              disabled={!hasMultipleCards}
              aria-label="Next card"
              className="fixed right-3 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-[#e0d3c0] bg-[#fffaf0]/88 text-2xl font-light text-[#7d705f] shadow-lg transition hover:bg-white hover:text-[#2f2a23] disabled:opacity-25 sm:right-6"
            >
              ›
            </button>
          </div>

          {isSharing ? (
            <ShareCardDialog
              card={selectedCard}
              index={selectedIndex}
              onClose={() => setIsSharing(false)}
            />
          ) : null}
        </div>
      ) : null}
    </>
  );
}
