import { createClient } from "@supabase/supabase-js";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import LoginButton from "@/components/auth/LoginButton";
import { formatDate } from "@/components/cards/cardUiUtils";
import type { ShareCardPayload } from "@/lib/shareCardPayload";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { CardImageFitMode } from "@/lib/types";

import SharedCardPreview from "./SharedCardPreview";

const cardImagesBucket = "card-images";

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

export const dynamic = "force-dynamic";
export const dynamicParams = true;

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

function importedCardImagePath(userId: string, cardId: string) {
  return `users/${userId}/cards/${cardId}/front.webp`;
}

async function copySharedImageToRecipientStorage({
  cardId,
  imagePath,
  supabase,
  userId,
}: {
  cardId: string;
  imagePath: string;
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  userId: string;
}) {
  if (!imagePath) {
    return null;
  }

  try {
    const response = await fetch(imagePath);

    if (!response.ok) {
      throw new Error(`Image fetch failed: ${response.status}`);
    }

    const contentType = response.headers.get("content-type") ?? "image/webp";
    const imageBody = await response.arrayBuffer();
    const storagePath = importedCardImagePath(userId, cardId);
    const { error } = await supabase.storage
      .from(cardImagesBucket)
      .upload(storagePath, imageBody, {
        contentType,
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

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isCardImageFitMode(value: unknown): value is CardImageFitMode {
  return value === "cover" || value === "blurExtend";
}

function parseShareCardPayload(value: unknown): ShareCardPayload | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const payload = value as Record<string, unknown>;
  const card = payload.card;
  const creator = payload.creator;

  if (payload.schemaVersion !== 1 || !card || typeof card !== "object") {
    return null;
  }

  const cardRecord = card as Record<string, unknown>;
  const creatorRecord =
    creator && typeof creator === "object" ? (creator as Record<string, unknown>) : {};
  const imageFitMode = isCardImageFitMode(cardRecord.imageFitMode)
    ? cardRecord.imageFitMode
    : "cover";

  if (!isString(cardRecord.createdAt) || !isString(cardRecord.updatedAt)) {
    return null;
  }

  return {
    schemaVersion: 1,
    card: {
      backText: isString(cardRecord.backText) ? cardRecord.backText : "",
      createdAt: cardRecord.createdAt,
      frontComment: isString(cardRecord.frontComment)
        ? cardRecord.frontComment
        : "",
      frontText: isString(cardRecord.frontText) ? cardRecord.frontText : "",
      imageFitMode,
      imagePath: isString(cardRecord.imagePath) ? cardRecord.imagePath : "",
      linkUrl: isString(cardRecord.linkUrl) ? cardRecord.linkUrl : "",
      updatedAt: cardRecord.updatedAt,
    },
    creator: {
      label: isString(creatorRecord.label) ? creatorRecord.label : "",
    },
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
    creatorLabel: row.creator_label,
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

  if (!token) {
    redirect("/cards");
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/share/${token}?import=login-required`);
  }

  const shareCard = await getShareCardState(token);

  if (shareCard.status !== "available") {
    redirect(`/share/${token}?import=unavailable`);
  }

  const now = new Date().toISOString();
  const card = shareCard.payload.card;
  const newCardId = generateImportedCardId();
  const importedImagePath = await copySharedImageToRecipientStorage({
    cardId: newCardId,
    imagePath: card.imagePath ?? "",
    supabase,
    userId: user.id,
  });
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
    redirect(`/share/${token}?import=failed`);
  }

  const { error: cardError } = await supabase.from("cards").insert({
    back_text: card.backText ?? "",
    created_at: now,
    deck_id: "uncategorized",
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
  isSignedIn,
  token,
}: {
  importStatus?: string;
  isSignedIn: boolean;
  token: string;
}) {
  const statusMessage =
    importStatus === "login-required"
      ? "追加するにはログインしてください"
      : importStatus === "failed"
        ? "カードを追加できませんでした"
        : importStatus === "unavailable"
          ? "この共有カードは追加できません"
          : "";

  return (
    <section className="mx-auto w-full max-w-xl rounded-[18px] border border-[#e8ddcb] bg-[#fffaf0]/82 p-4 text-center shadow-[0_18px_54px_rgba(87,72,52,0.13)]">
      {isSignedIn ? (
        <form action={importSharedCard}>
          <input type="hidden" name="token" value={token} />
          <button
            type="submit"
            className="w-full rounded-full bg-[#2f2a23] px-5 py-3 text-sm font-semibold text-[#fffaf0] transition hover:bg-[#4a4034] focus:outline-none focus:ring-2 focus:ring-[#2f2a23] focus:ring-offset-2 focus:ring-offset-[#fffaf0]"
          >
            Life Cardsへ追加
          </button>
        </form>
      ) : (
        <div className="grid gap-3">
          <p className="text-sm font-semibold text-[#5f5346]">
            追加するにはログインしてください
          </p>
          <div className="flex justify-center">
            <LoginButton />
          </div>
        </div>
      )}
      {statusMessage ? (
        <p className="mt-3 text-xs font-semibold text-[#a24d3c]">
          {statusMessage}
        </p>
      ) : null}
      <p className="mt-3 text-xs leading-5 text-[#8d7f6e]">
        共有カードはコピーとして未分類デッキに追加されます。
      </p>
    </section>
  );
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
            {shareCard.creatorLabel}さんからカードが届きました
          </h1>
          {expiresAt ? (
            <p className="mt-3 text-sm font-medium text-[#8d7f6e]">
              有効期限: {expiresAt}
            </p>
          ) : null}
        </div>

        <SharedCardPreview card={card} date={date} />

        <ImportPanel
          importStatus={importStatus}
          isSignedIn={Boolean(userId)}
          token={token}
        />
      </section>
    </main>
  );
}
