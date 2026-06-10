"use client";

import { useCallback, useEffect, useState } from "react";

import type { EncounterMetadata } from "@/domain/reencounter/types";
import { CardRepository } from "@/lib/cardRepository";
import { DeckRepository } from "@/lib/deckRepository";
import { EncounterRepository } from "@/lib/encounterRepository";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { getProfileForCurrentUser } from "@/lib/supabase/profileSupabaseRepository";
import type { Card, Deck } from "@/lib/types";
import { recordUsageEvent } from "@/lib/usageEvents";

export type CardHomeLoadStatus = "loading" | "ready" | "empty" | "error";

type Params = {
  initialCards: Card[];
  initialDecks: Deck[];
};

export default function useCardHomeData({
  initialCards,
  initialDecks,
}: Params) {
  const [allCards, setAllCards] = useState<Card[]>([]);
  const [allDecks, setAllDecks] = useState<Deck[]>([]);
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

    queueMicrotask(async () => {
      if (!isActive) {
        return;
      }

      setLoadStatus("loading");

      try {
        const supabase = createSupabaseBrowserClient();
        await supabase.auth.getSession();

        const [repositoryDecks, repositoryCards, repositoryEncounterMetadata] =
          await Promise.all([
            DeckRepository.getDecksForCurrentUser(initialDecks),
            CardRepository.getCardsForCurrentUser(initialCards),
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
  }, [initialCards, initialDecks]);

  useEffect(() => {
    let isActive = true;

    queueMicrotask(async () => {
      try {
        const supabase = createSupabaseBrowserClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();

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
  }, []);

  const recordCardReencounter = useCallback(async (cardId: string) => {
    const nextEncounterMetadata =
      await EncounterRepository.recordReencounterForCurrentUser(
        cardId,
        new Date().toISOString(),
      );

    setEncounterMetadataByCardId(nextEncounterMetadata);
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
