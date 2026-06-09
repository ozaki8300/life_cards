"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { getProfileForCurrentUser } from "@/lib/supabase/profileSupabaseRepository";

import LoginButton from "./LoginButton";
import LogoutButton from "./LogoutButton";

type AuthState =
  | { status: "loading" }
  | { status: "signed-out" }
  | { displayName?: string; status: "signed-in" }
  | { status: "unavailable" };

export default function AuthStatus() {
  const [authState, setAuthState] = useState<AuthState>({ status: "loading" });

  useEffect(() => {
    let isActive = true;

    function fallbackDisplayNameFor(user: User) {
      const metadataName = user.user_metadata.name;

      if (typeof metadataName === "string" && metadataName.trim()) {
        return metadataName.trim();
      }

      return user.email?.split("@")[0]?.trim() || "Life Cards User";
    }

    async function setSignedInState(user: User) {
      try {
        const profile = await getProfileForCurrentUser();
        const profileDisplayName = profile?.displayName.trim();

        if (isActive) {
          setAuthState({
            displayName: profileDisplayName || fallbackDisplayNameFor(user),
            status: "signed-in",
          });
        }
      } catch (error) {
        console.warn("Life Cards auth profile load failed", error);

        if (isActive) {
          setAuthState({
            displayName: fallbackDisplayNameFor(user),
            status: "signed-in",
          });
        }
      }
    }

    try {
      const supabase = createSupabaseBrowserClient();

      supabase.auth.getSession().then(({ data }) => {
        if (!isActive) {
          return;
        }

        const user = data.session?.user;

        if (user) {
          setSignedInState(user);
          return;
        }

        setAuthState({ status: "signed-out" });
      });

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        const user = session?.user;

        if (user) {
          setSignedInState(user);
          return;
        }

        setAuthState({ status: "signed-out" });
      });
      function handleProfileUpdated(event: Event) {
        const displayName =
          event instanceof CustomEvent &&
          typeof event.detail?.displayName === "string"
            ? event.detail.displayName.trim()
            : "";

        if (displayName) {
          setAuthState({ displayName, status: "signed-in" });
        }
      }

      window.addEventListener(
        "life-cards-profile-updated",
        handleProfileUpdated,
      );

      return () => {
        isActive = false;
        window.removeEventListener(
          "life-cards-profile-updated",
          handleProfileUpdated,
        );
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
        <span className="inline-flex max-w-[4.5rem] truncate rounded-full border border-[#e0d3c0] bg-[#fffaf0]/70 px-2.5 py-2 text-xs font-semibold text-[#7d705f] shadow-sm backdrop-blur sm:max-w-[7rem] sm:px-3 md:max-w-[10rem] lg:max-w-[180px]">
          {authState.displayName ?? "username未設定"}
        </span>
        <LogoutButton onSignedOut={() => setAuthState({ status: "signed-out" })} />
      </span>
    );
  }

  return <LoginButton />;
}
