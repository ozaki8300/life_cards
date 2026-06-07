"use client";

import { useEffect, useState } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

import LoginButton from "./LoginButton";
import LogoutButton from "./LogoutButton";

type AuthState =
  | { status: "loading" }
  | { status: "signed-out" }
  | { email?: string; status: "signed-in" }
  | { status: "unavailable" };

export default function AuthStatus() {
  const [authState, setAuthState] = useState<AuthState>({ status: "loading" });

  useEffect(() => {
    let isActive = true;

    try {
      const supabase = createSupabaseBrowserClient();

      supabase.auth.getSession().then(({ data }) => {
        if (!isActive) {
          return;
        }

        const user = data.session?.user;

        setAuthState(
          user
            ? { email: user.email ?? undefined, status: "signed-in" }
            : { status: "signed-out" },
        );
      });

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        const user = session?.user;

        setAuthState(
          user
            ? { email: user.email ?? undefined, status: "signed-in" }
            : { status: "signed-out" },
        );
      });

      return () => {
        isActive = false;
        subscription.unsubscribe();
      };
    } catch {
      queueMicrotask(() => {
        if (isActive) {
          setAuthState({ status: "unavailable" });
        }
      });
    }

    return () => {
      isActive = false;
    };
  }, []);

  if (authState.status === "unavailable") {
    return null;
  }

  if (authState.status === "loading") {
    return (
      <span className="hidden h-9 items-center rounded-full border border-[#e0d3c0] bg-[#fffaf0]/70 px-3 text-xs font-semibold text-[#7d705f] shadow-sm backdrop-blur sm:inline-flex">
        Auth...
      </span>
    );
  }

  if (authState.status === "signed-in") {
    return (
      <span className="inline-flex items-center gap-2">
        {authState.email ? (
          <span className="hidden max-w-[180px] truncate rounded-full border border-[#e0d3c0] bg-[#fffaf0]/70 px-3 py-2 text-xs font-semibold text-[#7d705f] shadow-sm backdrop-blur lg:inline">
            {authState.email}
          </span>
        ) : null}
        <LogoutButton />
      </span>
    );
  }

  return <LoginButton />;
}
