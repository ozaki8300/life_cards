"use client";

import { useState } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Props = {
  className?: string;
};

export default function LogoutButton({ className = "" }: Props) {
  const [isLoading, setIsLoading] = useState(false);

  async function handleLogout() {
    setIsLoading(true);

    try {
      const supabase = createSupabaseBrowserClient();
      await supabase.auth.signOut();
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={isLoading}
      className={`inline-flex h-10 items-center justify-center rounded-full border border-[#e0d3c0] bg-[#fffaf0]/88 px-2.5 text-xs font-semibold text-[#5f5346] shadow-sm backdrop-blur transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-[#d8c8aa] focus:ring-offset-2 focus:ring-offset-[#f7f3ea] disabled:opacity-60 sm:h-9 sm:px-3 ${className}`}
    >
      <span className="sm:hidden">{isLoading ? "..." : "Out"}</span>
      <span className="hidden sm:inline">{isLoading ? "Logout..." : "Logout"}</span>
    </button>
  );
}
