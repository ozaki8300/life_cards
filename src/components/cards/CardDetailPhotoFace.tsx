import Image from "next/image";
import type { PointerEventHandler } from "react";

type PhotoOffset = {
  x: number;
  y: number;
};

type Props = {
  backgroundImage: string;
  isDragging: boolean;
  offset: PhotoOffset;
  photoZoom: number;
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
  onPointerCancel,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}: Props) {
  return (
    <section className="absolute inset-0 overflow-hidden rounded-[24px] border border-white/25 bg-black/88 [backface-visibility:hidden]">
      <div
        className="absolute inset-0 overflow-hidden"
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
