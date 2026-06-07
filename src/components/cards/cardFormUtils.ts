export type BackMemoMode = "edit" | "preview";

export const imageActions = [
  { id: "photo", label: "写真", draftLabel: "写真" },
  { id: "camera", label: "カメラ", draftLabel: "カメラ" },
  { id: "screenshot", label: "スクショ", draftLabel: "スクショを追加" },
] as const;

export function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}
