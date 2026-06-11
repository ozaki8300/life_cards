"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export type UserProfile = {
  displayName: string;
  userId: string;
};

type ProfileRow = {
  display_name: string | null;
  user_id: string;
};

function supabaseErrorLog(error: unknown) {
  if (!error || typeof error !== "object") {
    return error;
  }

  const errorRecord = error as Record<string, unknown>;

  return {
    code: errorRecord.code,
    details: errorRecord.details,
    hint: errorRecord.hint,
    message: errorRecord.message,
    name: errorRecord.name,
    status: errorRecord.status,
    statusCode: errorRecord.statusCode,
  };
}

async function getCurrentUserClient() {
  const supabase = createSupabaseBrowserClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    throw error;
  }

  return user?.id ? { supabase, user } : null;
}

export async function getProfileForCurrentUser(): Promise<UserProfile | null> {
  const client = await getCurrentUserClient();

  if (!client) {
    return null;
  }

  const { data, error } = await client.supabase
    .from("profiles")
    .select("user_id, display_name")
    .eq("user_id", client.user.id)
    .maybeSingle<ProfileRow>();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return {
    displayName: data.display_name?.trim() ?? "",
    userId: data.user_id,
  };
}

export async function upsertProfileForCurrentUser(
  displayName: string,
): Promise<UserProfile> {
  const client = await getCurrentUserClient();
  const trimmedDisplayName = displayName.trim();

  if (!client) {
    throw new Error("Profile save requires a signed-in user.");
  }

  if (!trimmedDisplayName) {
    throw new Error("Display name is required.");
  }

  const payload = {
    display_name: trimmedDisplayName,
    updated_at: new Date().toISOString(),
    user_id: client.user.id,
  };
  const { data: existingProfile, error: existingProfileError } =
    await client.supabase
      .from("profiles")
      .select("user_id")
      .eq("user_id", client.user.id)
      .maybeSingle<Pick<ProfileRow, "user_id">>();

  if (existingProfileError) {
    console.warn("Life Cards profile lookup before save failed", {
      error: supabaseErrorLog(existingProfileError),
      userId: client.user.id,
    });
    throw existingProfileError;
  }

  const { error } = existingProfile
    ? await client.supabase
        .from("profiles")
        .update(payload)
        .eq("user_id", client.user.id)
    : await client.supabase.from("profiles").insert(payload);

  if (error) {
    console.warn("Life Cards profile upsert failed", {
      error: supabaseErrorLog(error),
      userId: client.user.id,
    });
    throw error;
  }

  return {
    displayName: trimmedDisplayName,
    userId: client.user.id,
  };
}
