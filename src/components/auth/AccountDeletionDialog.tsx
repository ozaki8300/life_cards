"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { deleteCurrentAccount } from "@/lib/accountDeletion";
import { STORAGE_KEYS } from "@/lib/storageKeys";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useEscapeKey } from "@/lib/useEscapeKey";

type Props = {
  onClose: () => void;
  onDeleted: () => void;
};

function clearLifeCardsLocalStorage() {
  if (typeof window === "undefined") {
    return;
  }

  Object.values(STORAGE_KEYS).forEach((key) => {
    window.localStorage.removeItem(key);
  });

  Array.from({ length: window.localStorage.length }, (_value, index) =>
    window.localStorage.key(index),
  )
    .filter((key): key is string => Boolean(key?.startsWith("life_cards.")))
    .forEach((key) => window.localStorage.removeItem(key));
}

export default function AccountDeletionDialog({ onClose, onDeleted }: Props) {
  const router = useRouter();
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEscapeKey(() => {
    if (!isDeleting) {
      onClose();
    }
  });

  async function handleDeleteAccount() {
    if (!isConfirmed || isDeleting) {
      return;
    }

    setIsDeleting(true);
    setErrorMessage("");

    try {
      await deleteCurrentAccount();
      clearLifeCardsLocalStorage();

      try {
        const supabase = createSupabaseBrowserClient();
        await supabase.auth.signOut();
      } catch {
        // The server has already deleted the account; local cleanup continues.
      }

      onDeleted();
      router.push("/cards");
      router.refresh();
    } catch {
      setErrorMessage(
        "削除できませんでした。時間をおいてもう一度お試しください。",
      );
      setIsDeleting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[70] bg-[#3b3126]/45 p-4 backdrop-blur-sm">
      <button
        type="button"
        aria-label="アカウント削除確認を閉じる"
        className="absolute inset-0 cursor-default"
        disabled={isDeleting}
        onClick={onClose}
      />
      <section className="relative mx-auto mt-[12vh] grid w-full max-w-[390px] gap-4 rounded-[20px] border border-[#e8ddcb] bg-[#fffaf0] p-5 text-[#332d25] shadow-[0_24px_70px_rgba(87,72,52,0.28)]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#a19380]">
            Account
          </p>
          <h2 className="mt-1 text-lg font-semibold">アカウントを削除しますか？</h2>
          <p className="mt-2 text-sm leading-6 text-[#7d705f]">
            この操作は取り消せません。以下のデータが削除されます。
          </p>
        </div>

        <ul className="grid gap-2 rounded-[14px] border border-[#eadfce] bg-white/56 p-3 text-sm font-semibold text-[#5f5346]">
          <li>アカウント</li>
          <li>cards / decks / reencounter data</li>
          <li>uploaded images</li>
          <li>shared card links</li>
        </ul>

        <label className="flex items-start gap-3 rounded-[14px] border border-[#e6c9be] bg-[#fff4ef] p-3 text-sm font-semibold text-[#8d4835]">
          <input
            type="checkbox"
            checked={isConfirmed}
            disabled={isDeleting}
            onChange={(event) => setIsConfirmed(event.target.checked)}
            className="mt-1 h-4 w-4 accent-[#9b4b35]"
          />
          <span>削除すると元に戻せないことを理解しました。</span>
        </label>

        {errorMessage ? (
          <p className="rounded-[14px] border border-[#e7b8a9] bg-[#fff2ee] px-3 py-2 text-sm font-semibold text-[#a24d3c]">
            {errorMessage}
          </p>
        ) : null}

        <div className="grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="rounded-full border border-[#e0d3c0] bg-white/72 px-4 py-3 text-sm font-semibold text-[#7d705f] transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-[#d8c8aa] disabled:cursor-not-allowed disabled:opacity-55"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={handleDeleteAccount}
            disabled={!isConfirmed || isDeleting}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-[#e6c9be] bg-[#9b4b35] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#873e2c] focus:outline-none focus:ring-2 focus:ring-[#d8a08f] disabled:cursor-not-allowed disabled:bg-[#b9978d]"
          >
            {isDeleting ? (
              <span
                aria-hidden="true"
                className="h-4 w-4 rounded-full border-2 border-white/45 border-t-white motion-safe:animate-spin"
              />
            ) : null}
            {isDeleting ? "削除中..." : "削除する"}
          </button>
        </div>
      </section>
    </div>
  );
}
