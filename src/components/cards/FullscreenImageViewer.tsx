"use client";

import Image from "next/image";
import { useEffect } from "react";

import { useEscapeKey } from "@/lib/useEscapeKey";

type Props = {
  alt?: string;
  imageSrc: string;
  onClose: () => void;
};

export default function FullscreenImageViewer({
  alt = "",
  imageSrc,
  onClose,
}: Props) {
  useEscapeKey(onClose);

  useEffect(() => {
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverscroll = document.documentElement.style.overscrollBehavior;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overscrollBehavior = "none";

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overscrollBehavior = previousHtmlOverscroll;
    };
  }, []);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="画像ビューア"
      className="pointer-events-auto fixed inset-0 z-[80] h-[100dvh] w-screen overflow-hidden bg-[#050505] text-white"
      onClick={(event) => event.stopPropagation()}
      onPointerCancel={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
      onPointerMove={(event) => event.stopPropagation()}
      onPointerUp={(event) => event.stopPropagation()}
      onTouchEnd={(event) => event.stopPropagation()}
      onTouchMove={(event) => event.stopPropagation()}
      onTouchStart={(event) => event.stopPropagation()}
    >
      <div
        className="relative h-full w-full select-none overflow-hidden"
        style={{
          WebkitTouchCallout: "none",
          WebkitUserSelect: "none",
        }}
      >
        <div
          className="absolute inset-0"
        >
          <Image
            src={imageSrc}
            alt={alt}
            fill
            sizes="100vw"
            className="object-contain"
            priority
            unoptimized
          />
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-end bg-gradient-to-b from-black/70 to-transparent px-3 pb-10 pt-[calc(env(safe-area-inset-top)+0.75rem)] sm:px-5">
        <button
          type="button"
          aria-label="閉じる"
          onClick={onClose}
          className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-black/45 text-2xl leading-none text-white shadow-[0_8px_24px_rgba(0,0,0,0.35)] backdrop-blur-md transition hover:bg-black/65 focus:outline-none focus:ring-2 focus:ring-white/70"
        >
          <span aria-hidden="true" className="-translate-y-px">
            ×
          </span>
        </button>
      </div>
    </div>
  );
}
