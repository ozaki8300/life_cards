"use client";

import { useState } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Props = {
  className?: string;
  nextPath?: string;
};

function isSafeNextPath(value: string | undefined): value is string {
  return Boolean(value && value.startsWith("/") && !value.startsWith("//"));
}

export default function LoginButton({ className = "", nextPath }: Props) {
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleLogin() {
    setErrorMessage("");
    setIsLoading(true);

    try {
      const supabase = createSupabaseBrowserClient();
      const callbackUrl = new URL("/auth/callback", window.location.origin);

      if (isSafeNextPath(nextPath)) {
        callbackUrl.searchParams.set("next", nextPath);
      }

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: callbackUrl.toString(),
        },
      });

      if (error) {
        setErrorMessage("ログインできませんでした");
        setIsLoading(false);
      }
    } catch {
      setErrorMessage("Supabase設定を確認してください");
      setIsLoading(false);
    }
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={handleLogin}
        disabled={isLoading}
        className={`inline-flex h-9 items-center justify-center rounded-full border border-[#e0d3c0] bg-[#fffaf0]/88 px-3 text-xs font-semibold text-[#5f5346] shadow-sm backdrop-blur transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-[#d8c8aa] focus:ring-offset-2 focus:ring-offset-[#f7f3ea] disabled:opacity-60 ${className}`}
      >
        {isLoading ? "Login..." : "Google Login"}
      </button>
      {errorMessage ? (
        <span className="hidden text-[11px] font-semibold text-[#9b4b35] sm:inline">
          {errorMessage}
        </span>
      ) : null}
    </span>
  );
}
