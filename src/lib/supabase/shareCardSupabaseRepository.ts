"use client";

import {
  createShareCardPayload,
  type ShareCardPayload,
  type ShareCardType,
} from "@/lib/shareCardPayload";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Card } from "@/lib/types";

const shareDurationMs = 7 * 24 * 60 * 60 * 1000;
const shareTokenByteLength = 24;

type CreateShareCardOptions = {
  origin?: string;
  shareType?: ShareCardType;
};

export type CreatedShareCard = {
  expiresAt: string;
  shareUrl: string;
  token: string;
};

type ShareCardInsertRow = {
  card_payload: ShareCardPayload;
  creator_label: string;
  creator_user_id: string;
  expires_at: string;
  share_type: ShareCardType;
  source_card_id: string;
  token: string;
};

function generateShareToken() {
  const crypto = globalThis.crypto;

  if (!crypto?.getRandomValues) {
    throw new Error("Secure random token generation is not available.");
  }

  const bytes = new Uint8Array(shareTokenByteLength);
  crypto.getRandomValues(bytes);

  let binaryValue = "";
  bytes.forEach((byte) => {
    binaryValue += String.fromCharCode(byte);
  });

  return btoa(binaryValue).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function resolveShareOrigin(origin?: string) {
  const trimmedOrigin = origin?.trim().replace(/\/+$/g, "");

  if (trimmedOrigin) {
    return trimmedOrigin;
  }

  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  throw new Error("Share URL origin is required outside the browser.");
}

async function getCurrentUser() {
  const supabase = createSupabaseBrowserClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user;

  if (!user?.id) {
    throw new Error("Life Cards share creation requires a signed-in user.");
  }

  return { supabase, user };
}

export async function createShareCardForCurrentUser(
  card: Card,
  creatorLabel: string,
  options: CreateShareCardOptions = {},
): Promise<CreatedShareCard> {
  const { supabase, user } = await getCurrentUser();
  const token = generateShareToken();
  const origin = resolveShareOrigin(options.origin);
  const shareType = options.shareType ?? "card";
  const expiresAt = new Date(Date.now() + shareDurationMs).toISOString();
  const payload = createShareCardPayload(card, creatorLabel);
  const row: ShareCardInsertRow = {
    card_payload: payload,
    creator_label: creatorLabel,
    creator_user_id: user.id,
    expires_at: expiresAt,
    share_type: shareType,
    source_card_id: card.id,
    token,
  };

  const { error } = await supabase.from("share_cards").insert(row);

  if (error) {
    console.warn("Life Cards share_cards insert failed", {
      code: error.code,
      details: error.details,
      message: error.message,
    });
    throw error;
  }

  return {
    expiresAt,
    shareUrl: `${origin}/share/${token}`,
    token,
  };
}
