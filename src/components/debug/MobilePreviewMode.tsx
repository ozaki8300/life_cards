"use client";

import { useEffect, useMemo, useState } from "react";

type PreviewSize = {
  height: number;
  label: string;
  width: number;
};

const previewSizes: PreviewSize[] = [
  { height: 780, label: "390", width: 390 },
  { height: 720, label: "375", width: 375 },
];

function buildPreviewUrl() {
  const url = new URL(window.location.href);

  url.searchParams.delete("debugMobile");

  return `${url.pathname}${url.search}${url.hash}`;
}

export default function MobilePreviewMode() {
  const [previewState, setPreviewState] = useState({
    isEnabled: false,
    previewUrl: "",
  });
  const [activeSize, setActiveSize] = useState(previewSizes[0]);

  useEffect(() => {
    queueMicrotask(() => {
      if (process.env.NODE_ENV === "production") {
        return;
      }

      const params = new URLSearchParams(window.location.search);

      if (params.get("debugMobile") !== "1") {
        return;
      }

      setPreviewState({
        isEnabled: true,
        previewUrl: buildPreviewUrl(),
      });
    });
  }, []);

  const { isEnabled, previewUrl } = previewState;
  const closeUrl = useMemo(() => previewUrl || "/", [previewUrl]);

  if (!isEnabled) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[9999] overflow-auto bg-[#201a15] px-4 py-5 text-[#fffaf0] sm:px-6">
      <div className="mx-auto flex min-h-full max-w-6xl flex-col gap-4 lg:flex-row lg:items-start lg:justify-center">
        <aside className="shrink-0 rounded-[8px] border border-white/12 bg-white/8 p-3 shadow-[0_18px_50px_rgba(0,0,0,0.28)] backdrop-blur">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/54">
            Mobile preview
          </p>
          <div className="mt-3 flex gap-2">
            {previewSizes.map((size) => (
              <button
                key={size.label}
                type="button"
                onClick={() => setActiveSize(size)}
                className={`rounded-full border px-3 py-2 text-xs font-semibold transition ${
                  activeSize.width === size.width
                    ? "border-[#fffaf0] bg-[#fffaf0] text-[#2f2a23]"
                    : "border-white/18 bg-white/8 text-white/82 hover:bg-white/14"
                }`}
              >
                {size.label}px
              </button>
            ))}
            <a
              href={closeUrl}
              className="rounded-full border border-white/18 bg-white/8 px-3 py-2 text-xs font-semibold text-white/82 transition hover:bg-white/14"
            >
              Close
            </a>
          </div>
          <p className="mt-3 max-w-[22rem] text-xs leading-5 text-white/58">
            `?debugMobile=1` is development-only. The bottom dark bar simulates
            mobile Safari chrome pressure before real-device checks.
          </p>
        </aside>

        <div className="mx-auto shrink-0">
          <div
            className="overflow-hidden rounded-[30px] border-[10px] border-[#0f0d0b] bg-[#0f0d0b] shadow-[0_32px_90px_rgba(0,0,0,0.46)]"
            style={{ width: activeSize.width + 20 }}
          >
            <div className="flex h-7 items-center justify-center bg-[#0f0d0b]">
              <div className="h-1.5 w-20 rounded-full bg-white/16" />
            </div>
            <div
              className="relative overflow-hidden bg-[#f7f3ea]"
              style={{
                height: activeSize.height,
                width: activeSize.width,
              }}
            >
              <iframe
                key={`${previewUrl}-${activeSize.width}`}
                title={`Life Cards mobile preview ${activeSize.label}px`}
                src={previewUrl}
                className="h-full w-full border-0"
              />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 border-t border-black/18 bg-black/76 shadow-[0_-16px_28px_rgba(0,0,0,0.22)]">
                <div className="mx-auto mt-3 h-1.5 w-28 rounded-full bg-white/38" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
