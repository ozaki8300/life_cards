"use client";

import {
  createShareCardPayload,
  type ShareCardMode,
  type ShareCardPayload,
  type ShareCardType,
} from "@/lib/shareCardPayload";
import {
  createSupabaseBrowserClient,
  getSupabaseSessionSafely,
} from "@/lib/supabase/client";
import type { Card } from "@/lib/types";
import { recordUsageEvent } from "@/lib/usageEvents";

const shareDurationMs = 7 * 24 * 60 * 60 * 1000;
const shareTokenByteLength = 24;
const fallbackProductionOrigin = "https://life-cards-three.vercel.app";

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

type ShareCardInsertRow = {
  card_payload: ShareCardPayload;
  creator_label: string;
  creator_user_id: string;
  expires_at: string;
  share_type: ShareCardType;
  source_card_id: string;
  token: string;
};

type ReusableShareCardRow = {
  expires_at: string;
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
  const productionOrigin =
    process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/+$/g, "") ||
    fallbackProductionOrigin;
  const trimmedOrigin = origin?.trim().replace(/\/+$/g, "");

  if (trimmedOrigin && !trimmedOrigin.includes("localhost")) {
    return trimmedOrigin;
  }

  if (typeof window !== "undefined") {
    const windowOrigin = window.location.origin.replace(/\/+$/g, "");

    if (!windowOrigin.includes("localhost")) {
      return windowOrigin;
    }
  }

  return productionOrigin;
}

async function getCurrentUser() {
  const supabase = createSupabaseBrowserClient();
  const session = await getSupabaseSessionSafely(supabase);
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
  const origin = resolveShareOrigin(options.origin);
  const shareMode = options.shareMode ?? "withImage";
  const shareType = options.shareType ?? "card";
  const now = new Date();
  const nowIso = now.toISOString();
  const payload = createShareCardPayload(card, creatorLabel, shareMode);

  const { data: reusableShare, error: reusableShareError } = await supabase
    .from("share_cards")
    .select("token, expires_at")
    .eq("creator_user_id", user.id)
    .eq("source_card_id", card.id)
    .eq("share_type", shareType)
    .gt("expires_at", nowIso)
    .order("expires_at", { ascending: false })
    .limit(1)
    .maybeSingle<ReusableShareCardRow>();

  if (reusableShareError) {
    console.error("Life Cards share reuse lookup message:", reusableShareError.message);
    console.error("Life Cards share reuse lookup code:", reusableShareError.code);
    console.error("Life Cards share reuse lookup details:", reusableShareError.details);
    console.error("Life Cards share reuse lookup hint:", reusableShareError.hint);
    throw new Error(
      `share_cards reuse lookup failed: ${reusableShareError.message} (${
        reusableShareError.code ?? "no-code"
      })`,
    );
  }

  if (reusableShare?.token && reusableShare.expires_at) {
    const { error: updateError } = await supabase
      .from("share_cards")
      .update({
        card_payload: payload,
        creator_label: creatorLabel,
      })
      .eq("token", reusableShare.token);

    if (updateError) {
      console.error("Life Cards share payload update message:", updateError.message);
      console.error("Life Cards share payload update code:", updateError.code);
      console.error("Life Cards share payload update details:", updateError.details);
      console.error("Life Cards share payload update hint:", updateError.hint);
      throw new Error(
        `share_cards update failed: ${updateError.message} (${
          updateError.code ?? "no-code"
        })`,
      );
    }

    return {
      expiresAt: reusableShare.expires_at,
      shareUrl: `${origin}/share/${reusableShare.token}`,
      token: reusableShare.token,
    };
  }

  const token = generateShareToken();
  const expiresAt = new Date(now.getTime() + shareDurationMs).toISOString();

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
    console.error("Life Cards share insert message:", error.message);
    console.error("Life Cards share insert code:", error.code);
    console.error("Life Cards share insert details:", error.details);
    console.error("Life Cards share insert hint:", error.hint);
    console.error(
      "Life Cards share insert full:",
      JSON.stringify(error, null, 2),
    );
    throw new Error(
      `share_cards insert failed: ${error.message} (${error.code ?? "no-code"})`,
    );
  }

  await recordUsageEvent("share_created", {
    card_id: card.id,
    share_mode: shareMode,
    share_type: shareType,
  });

  return {
    expiresAt,
    shareUrl: `${origin}/share/${token}`,
    token,
  };
}
