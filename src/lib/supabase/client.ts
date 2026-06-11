"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Session, SupabaseClient } from "@supabase/supabase-js";

function getSupabaseBrowserEnv() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Supabase browser client requires NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }

  return {
    supabaseAnonKey,
    supabaseUrl,
  };
}

export function createSupabaseBrowserClient() {
  const { supabaseAnonKey, supabaseUrl } = getSupabaseBrowserEnv();

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}

export function isInvalidRefreshTokenError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const errorRecord = error as Record<string, unknown>;
  const messages = [
    errorRecord.message,
    errorRecord.error_description,
    errorRecord.error,
  ]
    .filter((value): value is string => typeof value === "string")
    .join(" ");

  return (
    messages.includes("Invalid Refresh Token") ||
    messages.includes("Refresh Token Not Found")
  );
}

export async function clearInvalidSupabaseSession(
  supabase: SupabaseClient,
) {
  try {
    await supabase.auth.signOut({ scope: "local" });
  } catch {
    // A broken local auth state should never block rendering signed-out UI.
  }
}

export async function getSupabaseSessionSafely(
  supabase: SupabaseClient = createSupabaseBrowserClient(),
): Promise<Session | null> {
  try {
    const { data, error } = await supabase.auth.getSession();

    if (error) {
      if (isInvalidRefreshTokenError(error)) {
        await clearInvalidSupabaseSession(supabase);
        return null;
      }

      throw error;
    }

    return data.session ?? null;
  } catch (error) {
    if (isInvalidRefreshTokenError(error)) {
      await clearInvalidSupabaseSession(supabase);
      return null;
    }

    throw error;
  }
}
