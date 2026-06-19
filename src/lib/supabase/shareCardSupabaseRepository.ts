"use client";

import type { ShareCardMode, ShareCardType } from "@/lib/shareCardPayload";
import type { Card } from "@/lib/types";

type CreateShareCardOptions = {
  origin?: string;
  shareMode?: ShareCardMode;
  shareType?: ShareCardType;
};

export type CreatedShareCard = {
  expiresAt: string;
  shareUrl: string;
  token: string;
};

type CreateShareCardResponse =
  | ({
      ok: true;
    } & CreatedShareCard)
  | {
      message?: string;
      ok: false;
    };

export async function createShareCardForCurrentUser(
  card: Card,
  creatorLabel: string,
  options: CreateShareCardOptions = {},
): Promise<CreatedShareCard> {
  const response = await fetch("/api/share-cards", {
    body: JSON.stringify({
      card,
      creatorLabel,
      options,
    }),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });
  const result = (await response.json()) as CreateShareCardResponse;

  if (!response.ok || !result.ok) {
    throw new Error(
      !result.ok && result.message
        ? result.message
        : "共有リンクを作成できませんでした。",
    );
  }

  return {
    expiresAt: result.expiresAt,
    shareUrl: result.shareUrl,
    token: result.token,
  };
}
