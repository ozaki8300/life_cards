import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

async function recordLoginEvent(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
) {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return;
    }

    const { error } = await supabase.from("usage_events").insert({
      event_name: "login",
      metadata: {
        provider: "google",
      },
      user_id: user.id,
    });

    if (error) {
      throw error;
    }
  } catch (error) {
    console.warn("Life Cards login usage event failed", error);
  }
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(new URL("/", requestUrl.origin));
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      return NextResponse.redirect(new URL("/", requestUrl.origin));
    }

    await recordLoginEvent(supabase);

    return NextResponse.redirect(new URL("/cards", requestUrl.origin));
  } catch {
    return NextResponse.redirect(new URL("/", requestUrl.origin));
  }
}
