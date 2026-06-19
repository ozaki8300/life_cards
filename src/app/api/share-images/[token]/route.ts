import { parseShareCardPayload } from "@/lib/shareCardPayload";
import {
  contentTypeForShareImageStoragePath,
  isShareImageStoragePathForToken,
  normalizeShareToken,
} from "@/lib/shareImagePaths";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const cardImagesBucket = "card-images";
const sharedImageCacheControl = "private, max-age=300";

type ShareCardImageRow = {
  card_payload: unknown;
  expires_at: string;
};

function imageErrorResponse(status: number) {
  return new Response(null, {
    headers: {
      "Cache-Control": "no-store",
    },
    status,
  });
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token: rawToken } = await context.params;
  const token = normalizeShareToken(rawToken);

  if (!token) {
    return imageErrorResponse(404);
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("share_cards")
    .select("card_payload,expires_at")
    .eq("token", token)
    .maybeSingle<ShareCardImageRow>();

  if (error || !data) {
    if (error) {
      console.warn("Life Cards share image lookup failed", error);
    }

    return imageErrorResponse(404);
  }

  if (new Date(data.expires_at).getTime() <= Date.now()) {
    return imageErrorResponse(410);
  }

  const payload = parseShareCardPayload(data.card_payload);
  const shareImageStoragePath =
    payload?.card.shareImageStoragePath?.trim().replace(/^\/+/, "") ?? "";

  if (
    !payload ||
    !isShareImageStoragePathForToken(shareImageStoragePath, token)
  ) {
    return imageErrorResponse(404);
  }

  const contentType = contentTypeForShareImageStoragePath(
    shareImageStoragePath,
  );

  if (!contentType) {
    return imageErrorResponse(404);
  }

  const { data: imageData, error: imageError } = await admin.storage
    .from(cardImagesBucket)
    .download(shareImageStoragePath);

  if (imageError || !imageData) {
    if (imageError) {
      console.warn("Life Cards share image download failed", imageError);
    }

    return imageErrorResponse(404);
  }

  return new Response(imageData, {
    headers: {
      "Cache-Control": sharedImageCacheControl,
      "Content-Type": contentType,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
