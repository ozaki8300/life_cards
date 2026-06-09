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

async function getCurrentUserClient() {
  const supabase = createSupabaseBrowserClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user;

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

  const { data, error } = await client.supabase
    .from("profiles")
    .upsert(
      {
        display_name: trimmedDisplayName,
        updated_at: new Date().toISOString(),
        user_id: client.user.id,
      },
      { onConflict: "user_id" },
    )
    .select("user_id, display_name")
    .single<ProfileRow>();

  if (error) {
    throw error;
  }

  return {
    displayName: data.display_name?.trim() ?? trimmedDisplayName,
    userId: data.user_id,
  };
}
