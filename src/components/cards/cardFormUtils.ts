export type BackMemoMode = "edit" | "preview";

export const imageActions = [
  { id: "photo", label: "写真", draftLabel: "写真" },
  { id: "camera", label: "カメラ", draftLabel: "カメラ" },
  { id: "remove", label: "削除", draftLabel: "画像を削除" },
  { id: "screenshot", label: "スクショ", draftLabel: "スクショを追加" },
  { id: "book", label: "本", draftLabel: "本を追加" },
  { id: "link", label: "リンク", draftLabel: "リンクを追加" },
] as const;

export function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}
