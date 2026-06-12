"use client";

type Props = {
  isVisible: boolean;
};

export default function MobileDesktopHint({ isVisible }: Props) {
  if (!isVisible) {
    return null;
  }

  const topUrl = typeof window === "undefined" ? "" : window.location.origin;

  if (!topUrl) {
    return null;
  }

  return (
    <aside className="sm:hidden rounded-[16px] border border-[#e3d7c6]/80 bg-[#fff8ec]/72 px-4 py-3 text-[#5f5346] shadow-[0_8px_22px_rgba(122,105,82,0.08)]">
      <div className="grid gap-3">
        <p className="min-w-0 text-sm leading-6">
          <span className="font-semibold">
            <span aria-hidden="true">💡 </span>
            長い振り返りはPCで。
          </span>
          <br />
          <span className="font-medium text-[#7d705f]">
            PC版なら、Back Memoをゆっくり整理できます。
          </span>
        </p>
        <a
          href={topUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-10 w-fit justify-self-end rounded-full border border-[#d8c8aa]/70 bg-white/62 px-3.5 py-2 text-xs font-semibold text-[#6f6253] transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-[#d8c8aa]"
        >
          PC版を開く
        </a>
      </div>
    </aside>
  );
}
