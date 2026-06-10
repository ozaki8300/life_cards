"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import QRCode from "react-qr-code";

import { createShareCardForCurrentUser } from "@/lib/supabase/shareCardSupabaseRepository";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { getProfileForCurrentUser } from "@/lib/supabase/profileSupabaseRepository";
import type { Card } from "@/lib/types";
import { useEscapeKey } from "@/lib/useEscapeKey";

import CardFace from "./CardFace";
import { defaultImageForCard, formatDate } from "./cardUiUtils";

const SHARE_EXPIRATION_DAYS = 7;
const COPY_SUCCESS_RESET_MS = 1500;
const SHARE_PREVIEW_BASE_WIDTH = 360;
const SHARE_PREVIEW_BASE_HEIGHT = 480;

export default function CardShareDialog({
  card,
  deckLabel,
  onClose,
}: {
  card: Card;
  deckLabel: string;
  onClose: () => void;
}) {
  const [copyStatus, setCopyStatus] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [isCreatingShare, setIsCreatingShare] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const copyStatusResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  useEscapeKey(onClose, { ignoreEditable: false });
  const formattedExpiresAt = useMemo(() => formatExpiresAt(expiresAt), [expiresAt]);
  const previewBackground = card.imagePath || defaultImageForCard(card);
  const copyButtonLabel = copyStatus === "コピーしました" ? "コピーしました" : "リンクをコピー";

  useEffect(() => {
    return () => {
      clearCopyStatusResetTimer();
    };
  }, []);

  function clearCopyStatusResetTimer() {
    if (copyStatusResetTimerRef.current) {
      clearTimeout(copyStatusResetTimerRef.current);
      copyStatusResetTimerRef.current = null;
    }
  }

  function showCopySuccess() {
    clearCopyStatusResetTimer();
    setCopyStatus("コピーしました");
    copyStatusResetTimerRef.current = setTimeout(() => {
      setCopyStatus("");
      copyStatusResetTimerRef.current = null;
    }, COPY_SUCCESS_RESET_MS);
  }

  async function resolveCreatorLabel() {
    const supabase = createSupabaseBrowserClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const user = session?.user;

    if (!user) {
      throw new Error("共有するにはログインしてください");
    }

    let profileDisplayName = "";

    try {
      const profile = await getProfileForCurrentUser();
      profileDisplayName = profile?.displayName.trim() ?? "";
    } catch (error) {
      console.warn("Life Cards share profile load failed", error);
    }

    if (profileDisplayName) {
      return profileDisplayName;
    }

    const metadataName = user.user_metadata.name;

    if (typeof metadataName === "string" && metadataName.trim()) {
      return metadataName.trim();
    }

    const emailPrefix = user.email?.split("@")[0]?.trim();

    return emailPrefix || "Life Cards User";
  }

  async function createShareUrl() {
    clearCopyStatusResetTimer();
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
    } catch (error) {
      console.warn("Life Cards share URL create failed", error);
      const message =
        error instanceof Error ? error.message : "Unknown share creation error";

      setErrorMessage(`共有リンクを作成できませんでした: ${message}`);
    } finally {
      setIsCreatingShare(false);
    }
  }

  async function copyShareUrl() {
    clearCopyStatusResetTimer();

    if (!shareUrl) {
      setCopyStatus("先に共有リンクを作成してください");
      return;
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      showCopySuccess();
    } catch (error) {
      console.warn("Life Cards share URL copy failed", error);
      setCopyStatus("コピーできませんでした");
    }
  }

  async function shareWithOs() {
    if (!shareUrl) {
      setCopyStatus("先に共有リンクを作成してください");
      return;
    }

    if (navigator.share) {
      try {
        await navigator.share({
          title: "Life Cards",
          text: card.frontText,
          url: shareUrl,
        });
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
          {!shareUrl ? (
            <section className="rounded-[16px] border border-[#e8ddcb] bg-[#f8f0e3] p-3">
              <div className="relative mx-auto h-[316.8px] w-[237.6px] overflow-visible sm:h-[345.6px] sm:w-[259.2px]">
                <div
                  className="absolute left-1/2 top-1/2 origin-center -translate-x-1/2 -translate-y-1/2 scale-[0.66] overflow-hidden rounded-[22px] shadow-[0_18px_42px_rgba(32,24,16,0.18)] sm:scale-[0.72]"
                  style={{
                    height: SHARE_PREVIEW_BASE_HEIGHT,
                    width: SHARE_PREVIEW_BASE_WIDTH,
                  }}
                >
                  <CardFace
                    backgroundImage={previewBackground}
                    backText={card.backText}
                    date={formatDate(card.createdAt)}
                    deckLabel={deckLabel}
                    face="front"
                    frontComment={card.frontComment}
                    frontText={card.frontText}
                    imageFitMode={card.imageFitMode}
                    linkUrl={card.linkUrl}
                    preserve3d={false}
                    size="preview"
                  />
                </div>
              </div>

              {errorMessage ? (
                <p className="mt-3 text-xs font-semibold text-[#a24d3c]">
                  {errorMessage}
                </p>
              ) : null}
            </section>
          ) : null}

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
              <div className="mt-4 rounded-[14px] border border-[#eadfce] bg-[#fffaf0]/72 px-4 py-3 text-left">
                <p className="text-xs font-medium leading-5 text-[#6f6253]">
                  この共有リンクは{SHARE_EXPIRATION_DAYS}日間有効です。
                </p>
                {formattedExpiresAt ? (
                  <p className="mt-1 text-xs font-semibold text-[#5f5346]">
                    有効期限: {formattedExpiresAt}
                  </p>
                ) : null}
              </div>
            </section>
          ) : null}
        </div>

        <div className={`mt-5 grid grid-cols-1 gap-3 ${shareUrl ? "sm:grid-cols-2" : ""}`}>
          {!shareUrl ? (
            <button
              type="button"
              onClick={createShareUrl}
              disabled={isCreatingShare}
              className="rounded-full bg-[#2f2a23] px-4 py-3 text-sm font-semibold text-[#fffaf0] transition hover:bg-[#4a4034] disabled:cursor-not-allowed disabled:bg-[#8d7f6e]"
            >
              {isCreatingShare ? "作成中..." : "共有リンクを作る"}
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={shareWithOs}
                className="rounded-full border border-[#e0d3c0] bg-white/72 px-4 py-3 text-sm font-semibold text-[#5f5346] transition hover:bg-white"
              >
                LINE・メールで送る
              </button>
              <button
                type="button"
                onClick={copyShareUrl}
                className="rounded-full border border-[#e0d3c0] bg-white/72 px-4 py-3 text-sm font-semibold text-[#7d705f] transition hover:bg-white"
              >
                {copyButtonLabel}
              </button>
            </>
          )}
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
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}
