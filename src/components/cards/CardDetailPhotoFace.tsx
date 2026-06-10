import Image from "next/image";
import type { PointerEventHandler } from "react";
import type { KeyboardEventHandler, MouseEventHandler } from "react";

type PhotoOffset = {
  x: number;
  y: number;
};

type Props = {
  backgroundImage: string;
  isDragging: boolean;
  offset: PhotoOffset;
  photoZoom: number;
  onOpenFullscreen: MouseEventHandler<HTMLDivElement>;
  onPointerCancel: PointerEventHandler<HTMLDivElement>;
  onPointerDown: PointerEventHandler<HTMLDivElement>;
  onPointerMove: PointerEventHandler<HTMLDivElement>;
  onPointerUp: PointerEventHandler<HTMLDivElement>;
};

export default function CardDetailPhotoFace({
  backgroundImage,
  isDragging,
  offset,
  photoZoom,
  onOpenFullscreen,
  onPointerCancel,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}: Props) {
  const handleKeyDown: KeyboardEventHandler<HTMLDivElement> = (event) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    event.currentTarget.click();
  };

  return (
    <section className="absolute inset-0 overflow-hidden rounded-[24px] border border-white/25 bg-black/88">
      <div
        role="button"
        tabIndex={0}
        aria-label="画像を全画面で開く"
        className="absolute inset-0 overflow-hidden"
        onClick={onOpenFullscreen}
        onKeyDown={handleKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
      >
        <div
          className={`relative flex h-full w-full touch-none items-center justify-center ${
            photoZoom > 1 ? (isDragging ? "cursor-grabbing" : "cursor-grab") : ""
          }`}
          style={{
            transform: `translate3d(${offset.x}px, ${offset.y}px, 0) scale(${photoZoom})`,
          }}
        >
          <Image
            src={backgroundImage}
            alt=""
            fill
            sizes="(max-width: 768px) 100vw, 896px"
            className="object-contain"
            unoptimized
          />
        </div>
      </div>
    </section>
  );
}
