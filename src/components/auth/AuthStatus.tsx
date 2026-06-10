"use client";

import { useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { getProfileForCurrentUser } from "@/lib/supabase/profileSupabaseRepository";

import AccountDeletionDialog from "./AccountDeletionDialog";
import LoginButton from "./LoginButton";
import { useLogout } from "./LogoutButton";
import ProfileSetupModal from "./ProfileSetupModal";

type AuthState =
  | { status: "loading" }
  | { status: "signed-out" }
  | { displayName?: string; status: "signed-in" }
  | { status: "unavailable" };

export default function AuthStatus() {
  const [authState, setAuthState] = useState<AuthState>({ status: "loading" });
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isAccountDeletionOpen, setIsAccountDeletionOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { isLoading: isLoggingOut, logout } = useLogout(() => {
    setAuthState({ status: "signed-out" });
    setIsDropdownOpen(false);
  });

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

  useEffect(() => {
    if (!isDropdownOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsDropdownOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isDropdownOpen]);

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
    const displayName = authState.displayName ?? "username未設定";

    return (
      <div ref={dropdownRef} className="relative inline-flex">
        <button
          type="button"
          onClick={() => setIsDropdownOpen((isOpen) => !isOpen)}
          aria-label="Open account menu"
          aria-expanded={isDropdownOpen}
          className="inline-flex h-10 min-w-10 max-w-[4.5rem] items-center justify-center rounded-full border border-[#e0d3c0] bg-[#fffaf0]/88 px-3 text-xs font-semibold text-[#5f5346] shadow-sm backdrop-blur transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-[#d8c8aa] focus:ring-offset-2 focus:ring-offset-[#f7f3ea] sm:h-11 sm:max-w-[7rem] sm:px-4 sm:text-sm md:max-w-[10rem] lg:max-w-[180px]"
          title={displayName}
        >
          <span className="block truncate">{displayName}</span>
        </button>

        {isDropdownOpen ? (
          <div className="absolute right-0 top-full z-50 mt-2 w-44 overflow-hidden rounded-lg border border-[#e0d3c0] bg-[#fffaf0]/95 py-1.5 text-sm text-[#5f5346] shadow-lg backdrop-blur">
            <div className="truncate border-b border-[#eadfcc] px-3 py-2 text-xs font-semibold text-[#7d705f]">
              {displayName}
            </div>
            <button
              type="button"
              onClick={() => {
                setIsDropdownOpen(false);
                setIsProfileModalOpen(true);
              }}
              className="flex w-full items-center px-3 py-2 text-left text-sm font-semibold transition hover:bg-white focus:bg-white focus:outline-none"
            >
              username変更
            </button>
            <button
              type="button"
              onClick={logout}
              disabled={isLoggingOut}
              className="flex w-full items-center px-3 py-2 text-left text-sm font-semibold transition hover:bg-white focus:bg-white focus:outline-none disabled:opacity-60"
            >
              {isLoggingOut ? "Logout..." : "Logout"}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsDropdownOpen(false);
                setIsAccountDeletionOpen(true);
              }}
              className="flex w-full items-center border-t border-[#eadfcc] px-3 py-2 text-left text-sm font-semibold text-[#9b4b35] transition hover:bg-[#fff4ef] focus:bg-[#fff4ef] focus:outline-none"
            >
              アカウント削除
            </button>
          </div>
        ) : null}
        {isAccountDeletionOpen ? (
          <AccountDeletionDialog
            onClose={() => setIsAccountDeletionOpen(false)}
            onDeleted={() => {
              setAuthState({ status: "signed-out" });
              setIsAccountDeletionOpen(false);
              setIsDropdownOpen(false);
              setIsProfileModalOpen(false);
            }}
          />
        ) : null}
        {isProfileModalOpen ? (
          <ProfileSetupModal
            initialDisplayName={displayName}
            onClose={() => setIsProfileModalOpen(false)}
            onSaved={(nextDisplayName) => {
              setAuthState({
                displayName: nextDisplayName,
                status: "signed-in",
              });
              setIsProfileModalOpen(false);
            }}
          />
        ) : null}
      </div>
    );
  }

  return <LoginButton />;
}
