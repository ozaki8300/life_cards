import { createClient } from "@supabase/supabase-js";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import sharp from "sharp";

import { formatDate } from "@/components/cards/cardUiUtils";
import {
  parseShareCardPayload,
  type ShareCardMode,
  type ShareCardPayload,
} from "@/lib/shareCardPayload";
import {
  isShareImageStoragePathForToken,
  normalizeShareToken,
} from "@/lib/shareImagePaths";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import SharedCardImportSubmitButton from "./SharedCardImportSubmitButton";
import SharedCardReceiveActions from "./SharedCardReceiveActions";
import SharedCardPreview from "./SharedCardPreview";

const cardImagesBucket = "card-images";
const sharedImageMaxLongEdge = 1600;
const sharedImageJpegQuality = 72;
const sharedImageWebpQuality = 72;

const cardImageExtensionsByContentType = {
  "image/jpeg": "jpg",
  "image/webp": "webp",
} as const;

type CardImageContentType = keyof typeof cardImageExtensionsByContentType;

type Props = {
  params: Promise<{
    token: string;
  }>;
  searchParams: Promise<{
    import?: string;
  }>;
};

type ShareCardRow = {
  card_payload: unknown;
  creator_label: string;
  expires_at: string;
};

type ShareCardCountRow = {
  import_count: number | null;
  view_count: number | null;
};

type ShareCardState =
  | { status: "available"; creatorLabel: string; expiresAt: string; payload: ShareCardPayload }
  | { status: "expired" }
  | { status: "not-found" };

type ImportImageMode = "withImage" | "withoutImage";

export const dynamic = "force-dynamic";
export const dynamicParams = true;
export const runtime = "nodejs";

export const metadata: Metadata = {
  title: "Shared Life Card",
  robots: {
    follow: false,
    index: false,
  },
};

function createShareReadClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function generateImportedCardId() {
  if (globalThis.crypto?.randomUUID) {
    return `card_${globalThis.crypto.randomUUID()}`;
  }

  return `card_${Date.now()}`;
}

function importedCardImagePath(
  userId: string,
  cardId: string,
  contentType: CardImageContentType,
) {
  const extension = cardImageExtensionsByContentType[contentType];

  return `users/${userId}/cards/${cardId}/front.${extension}`;
}

function isRecipientStoragePath(path: string, userId: string) {
  return path.trim().replace(/^\/+/, "").startsWith(`users/${userId}/`);
}

function isLocalOrPrivateHostname(hostname: string) {
  const normalizedHostname = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  const ipv4Parts = normalizedHostname.split(".").map((part) => Number(part));

  if (
    normalizedHostname === "localhost" ||
    normalizedHostname === "::1" ||
    normalizedHostname.startsWith("127.") ||
    normalizedHostname.startsWith("169.254.")
  ) {
    return true;
  }

  if (
    ipv4Parts.length === 4 &&
    ipv4Parts.every((part) => Number.isInteger(part) && part >= 0 && part <= 255)
  ) {
    const [first, second] = ipv4Parts;

    return (
      first === 10 ||
      (first === 172 && second >= 16 && second <= 31) ||
      (first === 192 && second === 168)
    );
  }

  return (
    normalizedHostname.startsWith("fc") ||
    normalizedHostname.startsWith("fd") ||
    normalizedHostname.startsWith("fe80:")
  );
}

function allowedSupabaseStorageOrigin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!supabaseUrl) {
    return "";
  }

  try {
    const parsedUrl = new URL(supabaseUrl);

    if (isLocalOrPrivateHostname(parsedUrl.hostname)) {
      return "";
    }

    return parsedUrl.origin;
  } catch {
    return "";
  }
}

function isAllowedV1FallbackImageUrl(imagePath: string) {
  const allowedOrigin = allowedSupabaseStorageOrigin();

  if (!allowedOrigin) {
    return false;
  }

  try {
    const parsedUrl = new URL(imagePath);

    if (parsedUrl.protocol !== "https:") {
      return false;
    }

    if (isLocalOrPrivateHostname(parsedUrl.hostname)) {
      return false;
    }

    return parsedUrl.origin === allowedOrigin;
  } catch {
    return false;
  }
}

async function recompressSharedImage(imageBody: ArrayBuffer) {
  const image = sharp(Buffer.from(imageBody), {
    limitInputPixels: 32_000_000,
  })
    .rotate()
    .resize({
      fit: "inside",
      height: sharedImageMaxLongEdge,
      width: sharedImageMaxLongEdge,
      withoutEnlargement: true,
    });

  try {
    const body = await image
      .clone()
      .webp({
        quality: sharedImageWebpQuality,
      })
      .toBuffer();

    return {
      body,
      contentType: "image/webp" as const,
    };
  } catch (error) {
    console.warn("Life Cards shared image WebP compression failed; retrying as JPEG", error);
    const body = await image.jpeg({
      mozjpeg: true,
      quality: sharedImageJpegQuality,
    }).toBuffer();

    return {
      body,
      contentType: "image/jpeg" as const,
    };
  }
}

async function copySharedImageToRecipientStorage({
  cardId,
  imagePath,
  shareImageStoragePath,
  supabase,
  token,
  userId,
}: {
  cardId: string;
  imagePath?: string;
  shareImageStoragePath?: string;
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  token: string;
  userId: string;
}) {
  const normalizedShareImageStoragePath =
    shareImageStoragePath?.trim().replace(/^\/+/, "") ?? "";
  const fallbackImagePath = imagePath?.trim() ?? "";

  if (!normalizedShareImageStoragePath && !fallbackImagePath) {
    return null;
  }

  try {
    let imageBody: ArrayBuffer;

    if (normalizedShareImageStoragePath) {
      if (
        !isShareImageStoragePathForToken(
          normalizedShareImageStoragePath,
          token,
        )
      ) {
        throw new Error("Shared image storage path is outside the current token.");
      }

      const shareReadClient = createShareReadClient();

      if (!shareReadClient) {
        throw new Error("Shared image storage read requires service role.");
      }

      const { data, error } = await shareReadClient.storage
        .from(cardImagesBucket)
        .download(normalizedShareImageStoragePath);

      if (error || !data) {
        throw error ?? new Error("Shared image download returned no data.");
      }

      imageBody = await data.arrayBuffer();
    } else {
      if (!isAllowedV1FallbackImageUrl(fallbackImagePath)) {
        throw new Error("V1 shared image fallback URL is not allowed.");
      }

      const response = await fetch(fallbackImagePath);

      if (!response.ok) {
        throw new Error(`Image fetch failed: ${response.status}`);
      }

      imageBody = await response.arrayBuffer();
    }

    const compressedImage = await recompressSharedImage(imageBody);
    const storagePath = importedCardImagePath(
      userId,
      cardId,
      compressedImage.contentType,
    );
    const { error } = await supabase.storage
      .from(cardImagesBucket)
      .upload(storagePath, compressedImage.body, {
        contentType: compressedImage.contentType,
        upsert: true,
      });

    if (error) {
      throw error;
    }

    return storagePath;
  } catch (error) {
    console.warn("Life Cards shared card image copy failed", error);
    return null;
  }
}

async function cleanupImportedCardImage({
  imagePath,
  supabase,
  userId,
}: {
  imagePath: string | null;
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  userId: string;
}) {
  if (!imagePath) {
    return;
  }

  const normalizedPath = imagePath.trim().replace(/^\/+/, "");

  if (!isRecipientStoragePath(normalizedPath, userId)) {
    console.warn("Life Cards shared card image cleanup skipped for out-of-scope path", {
      imagePath,
      userId,
    });
    return;
  }

  const { error } = await supabase.storage
    .from(cardImagesBucket)
    .remove([normalizedPath]);

  if (error) {
    console.warn("Life Cards shared card image cleanup failed", error);
  }
}

function isImportImageMode(value: unknown): value is ImportImageMode {
  return value === "withImage" || value === "withoutImage";
}

async function createDisplayShareCard(
  card: ShareCardPayload["card"],
  token: string,
) {
  const shareImageStoragePath = card.shareImageStoragePath?.trim() ?? "";
  const fallbackImagePath = card.imagePath?.trim() ?? "";
  const normalizedToken = normalizeShareToken(token);

  if (
    normalizedToken &&
    shareImageStoragePath &&
    isShareImageStoragePathForToken(shareImageStoragePath, normalizedToken)
  ) {
    return {
      ...card,
      imagePath: `/api/share-images/${normalizedToken}`,
    };
  }

  if (fallbackImagePath && isAllowedV1FallbackImageUrl(fallbackImagePath)) {
    return {
      ...card,
      imagePath: fallbackImagePath,
    };
  }

  return {
    ...card,
    defaultImageKey: "night" as const,
    imagePath: "",
  };
}

async function getShareCardState(token: string): Promise<ShareCardState> {
  const supabase = createShareReadClient();

  if (!supabase) {
    console.warn("Life Cards share read requires SUPABASE_SERVICE_ROLE_KEY.");
    return { status: "not-found" };
  }

  const { data, error } = await supabase
    .from("share_cards")
    .select("creator_label,card_payload,expires_at")
    .eq("token", token)
    .maybeSingle();

  if (error) {
    console.warn("Life Cards share lookup failed", error);
    return { status: "not-found" };
  }

  if (!data) {
    return { status: "not-found" };
  }

  const row = data as ShareCardRow;

  if (new Date(row.expires_at).getTime() <= Date.now()) {
    return { status: "expired" };
  }

  const payload = parseShareCardPayload(row.card_payload);

  if (!payload) {
    return { status: "not-found" };
  }

  return {
    creatorLabel: row.creator_label || payload.creator.label,
    expiresAt: row.expires_at,
    payload,
    status: "available",
  };
}

async function incrementShareViewCount(token: string) {
  const supabase = createShareReadClient();

  if (!supabase) {
    console.warn("Life Cards share view count requires SUPABASE_SERVICE_ROLE_KEY.");
    return;
  }

  const { data, error } = await supabase
    .from("share_cards")
    .select("view_count")
    .eq("token", token)
    .maybeSingle();

  if (error || !data) {
    console.warn("Life Cards share view count read failed", error);
    return;
  }

  const row = data as Pick<ShareCardCountRow, "view_count">;
  const { error: updateError } = await supabase
    .from("share_cards")
    .update({
      last_viewed_at: new Date().toISOString(),
      view_count: (row.view_count ?? 0) + 1,
    })
    .eq("token", token);

  if (updateError) {
    console.warn("Life Cards share view count update failed", updateError);
  }
}

async function incrementShareImportCount(token: string) {
  const supabase = createShareReadClient();

  if (!supabase) {
    console.warn("Life Cards share import count requires SUPABASE_SERVICE_ROLE_KEY.");
    return;
  }

  const { data, error } = await supabase
    .from("share_cards")
    .select("import_count")
    .eq("token", token)
    .maybeSingle();

  if (error || !data) {
    console.warn("Life Cards share import count read failed", error);
    return;
  }

  const row = data as Pick<ShareCardCountRow, "import_count">;
  const { error: updateError } = await supabase
    .from("share_cards")
    .update({
      import_count: (row.import_count ?? 0) + 1,
    })
    .eq("token", token);

  if (updateError) {
    console.warn("Life Cards share import count update failed", updateError);
  }
}

async function getSignedInUserId() {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    return user?.id ?? null;
  } catch {
    return null;
  }
}

async function importSharedCard(formData: FormData) {
  "use server";

  const token = String(formData.get("token") ?? "");
  const importImageModeValue = String(formData.get("importImageMode") ?? "");

  if (!token || !isImportImageMode(importImageModeValue)) {
    redirect("/cards");
  }

  const shareCard = await getShareCardState(token);

  if (shareCard.status !== "available") {
    redirect(`/share/${token}?import=unavailable`);
  }

  if (
    shareCard.payload.shareMode === "textOnly" &&
    importImageModeValue === "withImage"
  ) {
    redirect(`/share/${token}?import=unavailable`);
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/share/${token}?import=login-required`);
  }

  const now = new Date().toISOString();
  const card = shareCard.payload.card;
  const newCardId = generateImportedCardId();
  const importedImagePath =
    importImageModeValue === "withImage"
      ? await copySharedImageToRecipientStorage({
          cardId: newCardId,
          imagePath: card.imagePath ?? "",
          shareImageStoragePath: card.shareImageStoragePath ?? "",
          supabase,
          token,
          userId: user.id,
        })
      : null;

  if (importImageModeValue === "withImage" && !importedImagePath) {
    redirect(`/share/${token}?import=image-failed`);
  }

  const { error: deckError } = await supabase.from("decks").upsert(
    {
      created_at: now,
      id: "uncategorized",
      is_shared: false,
      name: "未分類",
      sort_order: 9999,
      updated_at: now,
      user_id: user.id,
    },
    { onConflict: "user_id,id" },
  );

  if (deckError) {
    console.warn("Life Cards shared card deck upsert failed", deckError);
    await cleanupImportedCardImage({
      imagePath: importedImagePath,
      supabase,
      userId: user.id,
    });
    redirect(`/share/${token}?import=failed`);
  }

  const { error: cardError } = await supabase.from("cards").insert({
    back_text: card.backText ?? "",
    created_at: now,
    deck_id: "uncategorized",
    default_image_key: card.defaultImageKey ?? "paper",
    front_comment: card.frontComment ?? "",
    front_text: card.frontText ?? "",
    id: newCardId,
    image_fit_mode: card.imageFitMode ?? "cover",
    image_path: importedImagePath,
    is_favorite: false,
    link_url: card.linkUrl?.trim() || null,
    updated_at: now,
    user_id: user.id,
  });

  if (cardError) {
    console.warn("Life Cards shared card import failed", cardError);
    await cleanupImportedCardImage({
      imagePath: importedImagePath,
      supabase,
      userId: user.id,
    });
    redirect(`/share/${token}?import=failed`);
  }

  await incrementShareImportCount(token);

  redirect("/cards");
}

function formatExpiresAt(expiresAt: string) {
  const date = new Date(expiresAt);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("ja-JP", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function MessagePanel({ message }: { message: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f3ea] px-5 py-10 text-[#2f2a23]">
      <section className="w-full max-w-md rounded-[20px] border border-[#e8ddcb] bg-[#fffaf0] p-6 text-center shadow-[0_24px_70px_rgba(87,72,52,0.18)]">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#a19380]">
          Shared Life Card
        </p>
        <h1 className="mt-4 text-2xl font-bold">{message}</h1>
        <Link
          href="/"
          className="mt-6 inline-flex rounded-full bg-[#2f2a23] px-5 py-3 text-sm font-semibold text-[#fffaf0] transition hover:bg-[#4a4034]"
        >
          Life Cardsへ
        </Link>
      </section>
    </main>
  );
}

function ImportPanel({
  importStatus,
  shareMode,
  token,
}: {
  importStatus?: string;
  shareMode: ShareCardMode;
  token: string;
}) {
  const statusMessage =
    importStatus === "login-required"
      ? "画像付きで保存するにはログインが必要です"
      : importStatus === "image-failed"
        ? "画像を保存できませんでした。共有期限内にもう一度お試しください。"
      : importStatus === "failed"
        ? "カードを保存できませんでした"
        : importStatus === "unavailable"
          ? "この共有カードは保存できません"
          : "";

  return (
    <section className="mx-auto w-full max-w-xl rounded-[18px] border border-[#e8ddcb] bg-[#fffaf0]/82 p-4 text-center shadow-[0_18px_54px_rgba(87,72,52,0.13)]">
      <h2 className="text-base font-bold text-[#332d25]">
        このカードを自分のカードに保存する
      </h2>

      <div className="mt-4 grid gap-3">
        <form action={importSharedCard}>
          <input type="hidden" name="token" value={token} />
          <input
            type="hidden"
            name="importImageMode"
            value={shareMode === "withImage" ? "withImage" : "withoutImage"}
          />
          <SharedCardImportSubmitButton
            idleLabel={
              shareMode === "withImage" ? "画像付きで保存する" : "保存する"
            }
            tone={shareMode === "withImage" ? "primary" : "secondary"}
          />
        </form>
      </div>
      {statusMessage ? (
        <p className="mt-3 text-xs font-semibold text-[#a24d3c]">
          {statusMessage}
        </p>
      ) : null}
    </section>
  );
}

function createCardTitle(frontText: string | undefined) {
  const trimmedFrontText = frontText?.trim() ?? "";

  if (!trimmedFrontText) {
    return "Life Card";
  }

  return trimmedFrontText;
}

export default async function ShareCardPage({ params, searchParams }: Props) {
  const { token } = await params;
  const { import: importStatus } = await searchParams;
  const shareCard = await getShareCardState(token);

  if (shareCard.status === "expired") {
    return <MessagePanel message="この共有カードは期限切れです" />;
  }

  if (shareCard.status === "not-found") {
    return <MessagePanel message="共有カードが見つかりません" />;
  }

  const { card } = shareCard.payload;
  const shareMode = shareCard.payload.shareMode;
  const displayCard = await createDisplayShareCard(card, token);
  const date = formatDate(card.createdAt);
  const expiresAt = formatExpiresAt(shareCard.expiresAt);
  await incrementShareViewCount(token);
  const userId = await getSignedInUserId();

  return (
    <main className="min-h-screen bg-[#f7f3ea] px-5 py-8 text-[#2f2a23] sm:px-8 lg:px-12">
      <section className="mx-auto flex max-w-5xl flex-col gap-7">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#a19380]">
            Shared Life Card
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            {createCardTitle(card.frontText)}
          </h1>
          {expiresAt ? (
            <p className="mt-3 text-sm font-medium text-[#8d7f6e]">
              有効期限: {expiresAt}
            </p>
          ) : null}
        </div>

        <SharedCardPreview card={displayCard} date={date} />

        {userId ? (
          <ImportPanel
            importStatus={importStatus}
            shareMode={shareMode}
            token={token}
          />
        ) : (
          <SharedCardReceiveActions
            card={card}
            shareMode={shareMode}
            token={token}
          />
        )}

        <section className="mx-auto w-full max-w-xl text-center text-[#6f6253]">
          <h2 className="text-sm font-bold text-[#332d25]">Life Cards</h2>
          <p className="mt-2 text-xs font-medium leading-5">
            経験・学び・志との再会を支援するカード
          </p>
        </section>
      </section>
    </main>
  );
}
