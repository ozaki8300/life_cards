import { NextResponse } from "next/server";

import { deleteAccountForUser } from "@/lib/accountDeletionService";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    const userId = user?.id;

    if (userError || !userId) {
      return NextResponse.json(
        {
          ok: false,
          message: "サインインが必要です。",
        },
        { status: 401 },
      );
    }

    await deleteAccountForUser(userId);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        message: "削除できませんでした。時間をおいてもう一度お試しください。",
      },
      { status: 500 },
    );
  }
}
