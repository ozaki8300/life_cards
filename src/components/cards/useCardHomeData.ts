"use client";

import { useCallback, useEffect, useState } from "react";

import type { EncounterMetadata } from "@/domain/reencounter/types";
import { CardRepository } from "@/lib/cardRepository";
import { DeckRepository } from "@/lib/deckRepository";
import { EncounterRepository } from "@/lib/encounterRepository";
import {
  createSupabaseBrowserClient,
  getSupabaseSessionSafely,
} from "@/lib/supabase/client";
import { getProfileForCurrentUser } from "@/lib/supabase/profileSupabaseRepository";
import type { Card, Deck } from "@/lib/types";
import { recordUsageEvent } from "@/lib/usageEvents";

export type CardHomeLoadStatus = "loading" | "ready" | "empty" | "error";
type CardHomeAuthStatus = "anonymous" | "authenticated" | "checking";

type Params = {
  initialCards: Card[];
  initialDecks: Deck[];
};

const ANONYMOUS_AUTH_SETTLE_MS = 250;
const STALE_AUTH_STATE_SETTLE_MS = 1500;

function hasStoredSupabaseAuthState() {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    const hasLocalStorageAuth = Object.keys(window.localStorage).some(
      (key) => key.startsWith("sb-") && key.includes("auth-token"),
    );

    if (hasLocalStorageAuth) {
      return true;
    }
  } catch {
    // Storage access can fail in restricted browser modes.
  }

  return document.cookie
    .split(";")
    .some((cookie) => {
      const cookieName = cookie.trim().split("=")[0] ?? "";

      return cookieName.startsWith("sb-") && cookieName.includes("auth-token");
    });
}

export default function useCardHomeData({
  initialCards,
  initialDecks,
}: Params) {
  const [allCards, setAllCards] = useState<Card[]>([]);
  const [allDecks, setAllDecks] = useState<Deck[]>([]);
  const [authStatus, setAuthStatus] =
    useState<CardHomeAuthStatus>("checking");
  const [authUserId, setAuthUserId] = useState("");
  const [loadStatus, setLoadStatus] =
    useState<CardHomeLoadStatus>("loading");
  const [encounterMetadataByCardId, setEncounterMetadataByCardId] = useState<
    Record<string, EncounterMetadata>
  >({});
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(() => new Set());
  const [isProfileSetupOpen, setIsProfileSetupOpen] = useState(false);
  const [profileDisplayName, setProfileDisplayName] = useState("");

  useEffect(() => {
    let isActive = true;
    let anonymousTimer: ReturnType<typeof setTimeout> | null = null;
    let staleAuthStateTimer: ReturnType<typeof setTimeout> | null = null;

    function clearAnonymousTimer() {
      if (anonymousTimer) {
        clearTimeout(anonymousTimer);
        anonymousTimer = null;
      }
    }

    function clearStaleAuthStateTimer() {
      if (staleAuthStateTimer) {
        clearTimeout(staleAuthStateTimer);
        staleAuthStateTimer = null;
      }
    }

    function resolveAnonymous() {
      if (isActive) {
        setAuthUserId("");
        setAuthStatus("anonymous");
      }
    }

    function resolveAnonymousAfterSettle() {
      clearAnonymousTimer();
      anonymousTimer = setTimeout(() => {
        resolveAnonymous();
      }, ANONYMOUS_AUTH_SETTLE_MS);
    }

    function resolveStaleAuthStateAfterSettle() {
      if (staleAuthStateTimer) {
        return;
      }

      staleAuthStateTimer = setTimeout(() => {
        staleAuthStateTimer = null;
        resolveAnonymous();
      }, STALE_AUTH_STATE_SETTLE_MS);
    }

    function handleSession(session: Awaited<ReturnType<typeof getSupabaseSessionSafely>>) {
      if (!isActive) {
        return;
      }

      const userId = session?.user?.id ?? "";

      if (userId) {
        clearAnonymousTimer();
        clearStaleAuthStateTimer();
        setAuthUserId(userId);
        setAuthStatus("authenticated");
        return;
      }

      setAuthUserId("");

      if (hasStoredSupabaseAuthState()) {
        clearAnonymousTimer();
        setAuthStatus("checking");
        resolveStaleAuthStateAfterSettle();
        return;
      }

      clearStaleAuthStateTimer();
      resolveAnonymousAfterSettle();
    }

    try {
      const supabase = createSupabaseBrowserClient();

      getSupabaseSessionSafely(supabase)
        .then(handleSession)
        .catch(() => {
          if (!isActive) {
            return;
          }

          if (hasStoredSupabaseAuthState()) {
            clearAnonymousTimer();
            setAuthUserId("");
            setAuthStatus("checking");
            resolveStaleAuthStateAfterSettle();
            return;
          }

          clearStaleAuthStateTimer();
          resolveAnonymousAfterSettle();
        });

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === "SIGNED_OUT") {
          clearAnonymousTimer();
          clearStaleAuthStateTimer();
          resolveAnonymous();
          return;
        }

        handleSession(session);
      });

      return () => {
        isActive = false;
        clearAnonymousTimer();
        clearStaleAuthStateTimer();
        subscription.unsubscribe();
      };
    } catch {
      queueMicrotask(() => {
        if (isActive) {
          setAuthUserId("");
          setAuthStatus("anonymous");
        }
      });
    }

    return () => {
      isActive = false;
      clearAnonymousTimer();
      clearStaleAuthStateTimer();
    };
  }, []);

  useEffect(() => {
    let isActive = true;

    queueMicrotask(async () => {
      if (!isActive) {
        return;
      }

      setLoadStatus("loading");

      if (authStatus === "checking") {
        setAllCards([]);
        setAllDecks([]);
        setEncounterMetadataByCardId({});
        setFavoriteIds(new Set());
        return;
      }

      try {
        const repositoryReadOptions = {
          disableFallback: authStatus === "authenticated",
        };

        if (authStatus === "authenticated") {
          setAllCards([]);
          setAllDecks([]);
          setEncounterMetadataByCardId({});
          setFavoriteIds(new Set());
        }

        const [repositoryDecks, repositoryCards, repositoryEncounterMetadata] =
          await Promise.all([
            DeckRepository.getDecksForCurrentUser(
              initialDecks,
              repositoryReadOptions,
            ),
            CardRepository.getCardsForCurrentUser(
              initialCards,
              repositoryReadOptions,
            ),
            EncounterRepository.getMetadataMapForCurrentUser(),
          ]);

        if (!isActive) {
          return;
        }

        setAllCards(repositoryCards);
        setAllDecks(repositoryDecks);
        setEncounterMetadataByCardId(repositoryEncounterMetadata);
        setFavoriteIds(
          new Set(
            repositoryCards
              .filter((card) => card.isFavorite)
              .map((card) => card.id),
          ),
        );
        setLoadStatus(repositoryCards.length === 0 ? "empty" : "ready");
      } catch {
        if (!isActive) {
          return;
        }

        setAllCards([]);
        setAllDecks([]);
        setEncounterMetadataByCardId({});
        setFavoriteIds(new Set());
        setLoadStatus("error");
      }
    });

    return () => {
      isActive = false;
    };
  }, [authStatus, authUserId, initialCards, initialDecks]);

  useEffect(() => {
    let isActive = true;

    queueMicrotask(async () => {
      try {
        const supabase = createSupabaseBrowserClient();
        const session = await getSupabaseSessionSafely(supabase);

        if (!isActive || !session?.user) {
          return;
        }

        const profile = await getProfileForCurrentUser();
        const displayName = profile?.displayName.trim() ?? "";

        if (!isActive) {
          return;
        }

        setProfileDisplayName(displayName);
        setIsProfileSetupOpen(!displayName);
      } catch (error) {
        console.warn("Life Cards profile load failed", error);
      }
    });

    return () => {
      isActive = false;
    };
  }, []);

  const toggleFavorite = useCallback(
    async (cardId: string) => {
      const card = allCards.find((item) => item.id === cardId);

      if (card) {
        const updatedCard = {
          ...card,
          isFavorite: !favoriteIds.has(cardId),
        };

        const nextCards = await CardRepository.updateCardForCurrentUser(
          updatedCard,
          allCards,
        );

        setAllCards(nextCards);
      }

      setFavoriteIds((current) => {
        const next = new Set(current);

        if (next.has(cardId)) {
          next.delete(cardId);
        } else {
          next.add(cardId);
        }

        return next;
      });
    },
    [allCards, favoriteIds],
  );

  const recordCardView = useCallback(async (cardId: string) => {
    const nextEncounterMetadata =
      await EncounterRepository.recordViewForCurrentUser(
        cardId,
        new Date().toISOString(),
      );

    setEncounterMetadataByCardId(nextEncounterMetadata);
    await recordUsageEvent("card_viewed", {
      cardId,
    });
  }, []);

  const recordCardReencounter = useCallback(async (cardId: string) => {
    const nextEncounterMetadata =
      await EncounterRepository.recordReencounterForCurrentUser(
        cardId,
        new Date().toISOString(),
      );

    setEncounterMetadataByCardId(nextEncounterMetadata);
    await recordUsageEvent("card_viewed", {
      cardId,
    });
    await recordUsageEvent("reencounter_opened", {
      card_id: cardId,
    });
  }, []);

  const handleDeleteCard = useCallback(
    async (cardId: string) => {
      const nextCards = await CardRepository.deleteCardForCurrentUser(
        cardId,
        allCards,
      );
      const nextEncounterMetadata =
        await EncounterRepository.deleteMetadataForCurrentUser(cardId);

      setAllCards(nextCards);
      setEncounterMetadataByCardId(nextEncounterMetadata);
      setFavoriteIds((current) => {
        if (!current.has(cardId)) {
          return current;
        }

        const next = new Set(current);
        next.delete(cardId);
        return next;
      });
    },
    [allCards],
  );

  const handleUpdateCard = useCallback((card: Card) => {
    setAllCards((currentCards) =>
      currentCards.map((item) => (item.id === card.id ? card : item)),
    );
  }, []);

  function handleProfileSaved(displayName: string) {
    setProfileDisplayName(displayName);
    setIsProfileSetupOpen(false);
  }

  return {
    allCards,
    allDecks,
    encounterMetadataByCardId,
    favoriteIds,
    handleDeleteCard,
    handleProfileSaved,
    handleUpdateCard,
    isProfileSetupOpen,
    loadStatus,
    profileDisplayName,
    recordCardReencounter,
    recordCardView,
    setAllCards,
    setAllDecks,
    toggleFavorite,
  };
}
