import { NextResponse } from "next/server";

import {
  createShareCardPayload,
  type ShareCardMode,
  type ShareCardPayload,
  type ShareCardType,
} from "@/lib/shareCardPayload";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ShareImageStorageAdminRepository } from "@/lib/supabase/shareImageStorageAdminRepository";
import type { Card } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const shareDurationMs = 7 * 24 * 60 * 60 * 1000;
const shareTokenByteLength = 24;
const fallbackProductionOrigin = "https://life-cards-three.vercel.app";

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

type CreateShareCardRequest = {
  card?: Card;
  creatorLabel?: string;
  options?: {
    origin?: string;
    shareMode?: ShareCardMode;
    shareType?: ShareCardType;
  };
};

function generateShareToken() {
  const bytes = new Uint8Array(shareTokenByteLength);
  crypto.getRandomValues(bytes);

  return Buffer.from(bytes)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function resolveShareOrigin(origin?: string) {
  const productionOrigin =
    process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/+$/g, "") ||
    fallbackProductionOrigin;
  const trimmedOrigin = origin?.trim().replace(/\/+$/g, "");

  if (trimmedOrigin && !trimmedOrigin.includes("localhost")) {
    return trimmedOrigin;
  }

  return productionOrigin;
}

function isShareCardMode(value: unknown): value is ShareCardMode {
  return value === "withImage" || value === "textOnly";
}

function isShareCardType(value: unknown): value is ShareCardType {
  return value === "card";
}

function isCard(value: unknown): value is Card {
  if (!value || typeof value !== "object") {
    return false;
  }

  const card = value as Partial<Card>;

  return (
    typeof card.id === "string" &&
    card.id.trim().length > 0 &&
    typeof card.deckId === "string" &&
    card.deckId.trim().length > 0 &&
    typeof card.createdAt === "string" &&
    typeof card.updatedAt === "string"
  );
}

async function assertSourceCardBelongsToUser({
  cardId,
  supabase,
  userId,
}: {
  cardId: string;
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  userId: string;
}) {
  const { data, error } = await supabase
    .from("cards")
    .select("id")
    .eq("user_id", userId)
    .eq("id", cardId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error("共有元カードが見つかりません。");
  }
}

async function recordShareCreated({
  cardId,
  shareMode,
  shareType,
  supabase,
  userId,
}: {
  cardId: string;
  shareMode: ShareCardMode;
  shareType: ShareCardType;
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  userId: string;
}) {
  const { error } = await supabase.from("usage_events").insert({
    event_name: "share_created",
    metadata: {
      card_id: cardId,
      share_mode: shareMode,
      share_type: shareType,
    },
    user_id: userId,
  });

  if (error) {
    console.warn("Life Cards share usage event insert failed", error);
  }
}

function errorResponse(message: string, status: number) {
  return NextResponse.json(
    {
      message,
      ok: false,
    },
    { status },
  );
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CreateShareCardRequest;
    const card = body.card;
    const creatorLabel = body.creatorLabel?.trim() ?? "";

    if (!isCard(card)) {
      return errorResponse("共有するカードが不正です。", 400);
    }

    if (!creatorLabel) {
      return errorResponse("共有者ラベルが不正です。", 400);
    }

    const shareMode = isShareCardMode(body.options?.shareMode)
      ? body.options.shareMode
      : "withImage";
    const shareType = isShareCardType(body.options?.shareType)
      ? body.options.shareType
      : "card";
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    const userId = user?.id;

    if (userError || !userId) {
      return errorResponse("共有リンクを作成するにはログインしてください。", 401);
    }

    await assertSourceCardBelongsToUser({
      cardId: card.id,
      supabase,
      userId,
    });

    const origin = resolveShareOrigin(body.options?.origin);
    const now = new Date();
    const nowIso = now.toISOString();
    const { data: reusableShare, error: reusableShareError } = await supabase
      .from("share_cards")
      .select("token, expires_at")
      .eq("creator_user_id", userId)
      .eq("source_card_id", card.id)
      .eq("share_type", shareType)
      .gt("expires_at", nowIso)
      .order("expires_at", { ascending: false })
      .limit(1)
      .maybeSingle<ReusableShareCardRow>();

    if (reusableShareError) {
      throw reusableShareError;
    }

    const token = reusableShare?.token ?? generateShareToken();
    const expiresAt =
      reusableShare?.expires_at ??
      new Date(now.getTime() + shareDurationMs).toISOString();
    const shareImageStoragePath =
      shareMode === "withImage"
        ? await ShareImageStorageAdminRepository.copyCardImageToShareImage({
            card,
            token,
            userId,
          })
        : "";

    if (shareMode === "withImage" && !shareImageStoragePath) {
      return errorResponse("画像あり共有には保存済み画像が必要です。", 400);
    }

    const payload = createShareCardPayload(card, creatorLabel, shareMode, {
      shareImageStoragePath: shareImageStoragePath ?? "",
    });

    if (reusableShare?.token && reusableShare.expires_at) {
      const { error: updateError } = await supabase
        .from("share_cards")
        .update({
          card_payload: payload,
          creator_label: creatorLabel,
        })
        .eq("token", reusableShare.token);

      if (updateError) {
        throw updateError;
      }

      return NextResponse.json({
        expiresAt: reusableShare.expires_at,
        ok: true,
        shareUrl: `${origin}/share/${reusableShare.token}`,
        token: reusableShare.token,
      });
    }

    const row: ShareCardInsertRow = {
      card_payload: payload,
      creator_label: creatorLabel,
      creator_user_id: userId,
      expires_at: expiresAt,
      share_type: shareType,
      source_card_id: card.id,
      token,
    };
    const { error } = await supabase.from("share_cards").insert(row);

    if (error) {
      throw error;
    }

    await recordShareCreated({
      cardId: card.id,
      shareMode,
      shareType,
      supabase,
      userId,
    });

    return NextResponse.json({
      expiresAt,
      ok: true,
      shareUrl: `${origin}/share/${token}`,
      token,
    });
  } catch (error) {
    console.warn("Life Cards share card API failed", error);

    return errorResponse(
      error instanceof Error
        ? error.message
        : "共有リンクを作成できませんでした。",
      500,
    );
  }
}
