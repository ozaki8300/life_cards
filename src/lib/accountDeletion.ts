"use client";

export async function deleteCurrentAccount() {
  const response = await fetch("/api/account/delete", {
    method: "POST",
  });
  const result = (await response.json().catch(() => null)) as
    | { message?: string; ok?: boolean }
    | null;

  if (!response.ok || !result?.ok) {
    throw new Error(
      result?.message ??
        "削除できませんでした。時間をおいてもう一度お試しください。",
    );
  }
}
