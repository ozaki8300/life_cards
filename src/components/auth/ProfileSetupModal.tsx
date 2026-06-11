"use client";

import { useEffect, useRef, useState } from "react";

import { upsertProfileForCurrentUser } from "@/lib/supabase/profileSupabaseRepository";
import { useEscapeKey } from "@/lib/useEscapeKey";

type Props = {
  initialDisplayName?: string;
  onClose?: () => void;
  onSaved: (displayName: string) => void;
};

export default function ProfileSetupModal({
  initialDisplayName = "",
  onClose,
  onSaved,
}: Props) {
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const displayNameInputRef = useRef<HTMLInputElement>(null);
  const canClose = Boolean(onClose);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      displayNameInputRef.current?.focus();
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEscapeKey(() => {
    onClose?.();
  }, { enabled: canClose, ignoreEditable: false });

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedDisplayName = displayName.trim();

    if (!trimmedDisplayName) {
      setErrorMessage("usernameを入力してください");
      return;
    }

    setErrorMessage("");
    setIsSaving(true);

    try {
      const profile = await upsertProfileForCurrentUser(trimmedDisplayName);
      window.dispatchEvent(
        new CustomEvent("life-cards-profile-updated", {
          detail: { displayName: profile.displayName },
        }),
      );
      onSaved(profile.displayName);
    } catch (error) {
      console.warn("Life Cards profile save failed", error);
      setErrorMessage("usernameを保存できませんでした");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#3b3126]/40 px-4 py-6 backdrop-blur-sm"
      onClick={() => onClose?.()}
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-[20px] border border-[#e8ddcb] bg-[#fffaf0] p-5 shadow-[0_24px_70px_rgba(87,72,52,0.28)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#a19380]">
              Profile
            </p>
            <h2 className="mt-2 text-xl font-bold text-[#332d25]">
              usernameを登録
            </h2>
          </div>
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-full border border-[#e0d3c0] bg-white px-3 py-1.5 text-xs font-semibold text-[#7d705f] shadow-sm transition hover:bg-white"
            >
              閉じる
            </button>
          ) : null}
        </div>

        <label className="mt-5 block">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#a19380]">
            username
          </span>
          <input
            autoFocus
            ref={displayNameInputRef}
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            placeholder="Life Cardsで表示する名前"
            className="mt-2 w-full rounded-[14px] border border-[#e8ddcb] bg-white/72 px-4 py-3 text-sm font-semibold text-[#332d25] outline-none focus:ring-2 focus:ring-[#d8c8aa]"
          />
        </label>

        {errorMessage ? (
          <p className="mt-3 text-xs font-semibold text-[#a24d3c]">
            {errorMessage}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isSaving}
          className="mt-5 w-full rounded-full bg-[#2f2a23] px-5 py-3 text-sm font-semibold text-[#fffaf0] transition hover:bg-[#4a4034] disabled:cursor-not-allowed disabled:bg-[#8d7f6e]"
        >
          {isSaving ? "保存中..." : "保存"}
        </button>
      </form>
    </div>
  );
}
