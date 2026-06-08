export type BackMemoMode = "edit" | "preview";

export const imageActions = [
  { id: "photo", label: "写真", draftLabel: "写真" },
  { id: "camera", label: "カメラ", draftLabel: "カメラ" },
  { id: "screenshot", label: "スクショ", draftLabel: "スクショを追加" },
] as const;

export function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

export function normalizeDateInputValue(value: string) {
  const trimmedValue = value.trim();
  const datePart = trimmedValue.match(/^\d{4}[-/.]\d{2}[-/.]\d{2}/)?.[0];

  if (datePart) {
    return datePart.replace(/[/.]/g, "-");
  }

  const parsedDate = new Date(trimmedValue);

  if (!Number.isNaN(parsedDate.getTime())) {
    return parsedDate.toISOString().slice(0, 10);
  }

  return todayInputValue();
}
