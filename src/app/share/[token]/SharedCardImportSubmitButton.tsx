"use client";

import { useFormStatus } from "react-dom";

type Props = {
  idleLabel: string;
  tone: "primary" | "secondary";
};

const buttonClassByTone = {
  primary:
    "w-full rounded-full bg-[#2f2a23] px-5 py-3 text-sm font-semibold text-[#fffaf0] transition hover:bg-[#4a4034] focus:outline-none focus:ring-2 focus:ring-[#2f2a23] focus:ring-offset-2 focus:ring-offset-[#fffaf0] disabled:cursor-not-allowed disabled:bg-[#8d7f6e]",
  secondary:
    "w-full rounded-full border border-[#d8c8aa] bg-white/76 px-5 py-3 text-sm font-semibold text-[#5f5346] transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-[#d8c8aa] focus:ring-offset-2 focus:ring-offset-[#fffaf0] disabled:cursor-not-allowed disabled:opacity-60",
};

export default function SharedCardImportSubmitButton({
  idleLabel,
  tone,
}: Props) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={buttonClassByTone[tone]}
    >
      {pending ? "登録中..." : idleLabel}
    </button>
  );
}
