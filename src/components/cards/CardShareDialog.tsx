"use client";

import { useMemo, useState } from "react";
import QRCode from "react-qr-code";

import { createShareCardForCurrentUser } from "@/lib/supabase/shareCardSupabaseRepository";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
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
  const [errorMessage, setErrorMessage] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [isCreatingShare, setIsCreatingShare] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  useEscapeKey(onClose, { ignoreEditable: false });
  const formattedExpiresAt = useMemo(() => formatExpiresAt(expiresAt), [expiresAt]);

  async function resolveCreatorLabel() {
    const supabase = createSupabaseBrowserClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const user = session?.user;

    if (!user) {
      throw new Error("共有するにはログインしてください");
    }

    const metadataName = user.user_metadata.name;

    if (typeof metadataName === "string" && metadataName.trim()) {
      return metadataName.trim();
    }

    const emailPrefix = user.email?.split("@")[0]?.trim();

    return emailPrefix || "Life Cards user";
  }

  async function createShareUrl() {
    setCopyStatus("");
    setErrorMessage("");
    setIsCreatingShare(true);

    try {
      const creatorLabel = await resolveCreatorLabel();
      const result = await createShareCardForCurrentUser(card, creatorLabel, {
        origin: window.location.origin,
        shareType: "card",
      });

      setExpiresAt(result.expiresAt);
      setShareUrl(result.shareUrl);
      setCopyStatus("共有URLを作成しました");
    } catch (error) {
      console.warn("Life Cards share URL create failed", error);
      const message =
        error instanceof Error ? error.message : "Unknown share creation error";

      setErrorMessage(`共有URLを作成できませんでした: ${message}`);
    } finally {
      setIsCreatingShare(false);
    }
  }

  async function copyShareUrl() {
    if (!shareUrl) {
      setCopyStatus("先に共有URLを作成してください");
      return;
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopyStatus("コピーしました");
    } catch (error) {
      console.warn("Life Cards share URL copy failed", error);
      setCopyStatus("コピーできませんでした");
    }
  }

  async function shareWithOs() {
    if (!shareUrl) {
      await createShareUrl();
      return;
    }

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

  return (
    <div
      className="fixed inset-0 z-20 overflow-y-auto bg-[#3b3126]/30 px-4 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] pt-[calc(env(safe-area-inset-top)+1rem)] backdrop-blur-sm [-webkit-overflow-scrolling:touch] sm:flex sm:items-center sm:justify-center sm:py-6"
      onClick={onClose}
    >
      <div
        className="relative mx-auto max-h-[calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-2rem)] w-full max-w-xl overflow-y-auto rounded-[20px] border border-[#e8ddcb] bg-[#fffaf0] p-4 shadow-[0_28px_80px_rgba(87,72,52,0.3)] [-webkit-overflow-scrolling:touch] sm:p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sticky top-0 z-10 -mx-4 -mt-4 flex items-start justify-between gap-4 border-b border-[#eadfce] bg-[#fffaf0]/96 px-4 pb-3 pt-4 backdrop-blur sm:static sm:m-0 sm:border-b-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-0">
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
            className="shrink-0 rounded-full border border-[#e0d3c0] bg-white px-4 py-2 text-sm font-semibold text-[#7d705f] shadow-sm transition hover:bg-white"
          >
            閉じる
          </button>
        </div>

        <div className="mt-5 grid gap-4">
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
                placeholder="共有URLを作成するとここに表示されます"
                className="mt-2 w-full rounded-[14px] border border-[#e8ddcb] bg-white/72 px-4 py-3 text-sm text-[#5f5346] outline-none focus:ring-2 focus:ring-[#d8c8aa]"
              />
            </label>
            {formattedExpiresAt ? (
              <p className="mt-2 text-xs font-medium text-[#8d7f6e]">
                有効期限: {formattedExpiresAt}
              </p>
            ) : null}
            {copyStatus ? (
              <p className="mt-2 text-xs font-semibold text-[#8d7f6e]">
                {copyStatus}
              </p>
            ) : null}
            {errorMessage ? (
              <p className="mt-2 text-xs font-semibold text-[#a24d3c]">
                {errorMessage}
              </p>
            ) : null}
          </section>

          {shareUrl ? (
            <section className="rounded-[16px] border border-[#e8ddcb] bg-white/70 p-4 text-center">
              <div className="mx-auto flex w-full max-w-[220px] justify-center rounded-[14px] border border-[#e0d3c0] bg-white p-3 shadow-sm">
                <QRCode
                  value={shareUrl}
                  size={192}
                  className="h-auto w-full max-w-[192px]"
                  bgColor="#ffffff"
                  fgColor="#2f2a23"
                  level="M"
                />
              </div>
              <p className="mt-3 text-xs font-semibold text-[#5f5346]">
                このQRは共有URLを開きます
              </p>
              <p className="mt-1 text-xs leading-5 text-[#8d7f6e]">
                URLを知っている人はカードを閲覧できます
              </p>
            </section>
          ) : null}
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <button
            type="button"
            onClick={createShareUrl}
            disabled={isCreatingShare}
            className="rounded-full bg-[#2f2a23] px-4 py-3 text-sm font-semibold text-[#fffaf0] transition hover:bg-[#4a4034] disabled:cursor-not-allowed disabled:bg-[#8d7f6e]"
          >
            {isCreatingShare ? "作成中..." : "共有URLを作成"}
          </button>
          <button
            type="button"
            onClick={shareWithOs}
            disabled={isCreatingShare}
            className="rounded-full border border-[#e0d3c0] bg-white/72 px-4 py-3 text-sm font-semibold text-[#5f5346] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            共有する
          </button>
          <button
            type="button"
            onClick={copyShareUrl}
            disabled={isCreatingShare}
            className="rounded-full border border-[#e0d3c0] bg-white/72 px-4 py-3 text-sm font-semibold text-[#7d705f] transition hover:bg-white"
          >
            URLをコピー
          </button>
        </div>
      </div>
    </div>
  );
}

function formatExpiresAt(expiresAt: string) {
  if (!expiresAt) {
    return "";
  }

  const date = new Date(expiresAt);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("ja-JP", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
