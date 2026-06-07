"use client";

import { useState } from "react";
import type { MutableRefObject, PointerEvent } from "react";

const photoZoomLevels = [1, 1.5, 2, 3] as const;

type PhotoOffset = {
  x: number;
  y: number;
};

type PhotoDragStart = {
  offsetX: number;
  offsetY: number;
  x: number;
  y: number;
};

type UsePhotoPanZoomInput = {
  isPhotoMode: boolean;
  shouldSkipNextClickRef: MutableRefObject<boolean>;
};

export default function usePhotoPanZoom({
  isPhotoMode,
  shouldSkipNextClickRef,
}: UsePhotoPanZoomInput) {
  const [photoZoom, setPhotoZoom] = useState(1);
  const [photoOffset, setPhotoOffset] = useState<PhotoOffset>({ x: 0, y: 0 });
  const [photoDragStart, setPhotoDragStart] = useState<PhotoDragStart | null>(
    null,
  );

  const isPhotoDragging = Boolean(photoDragStart);
  const zoomLabel =
    Number.isInteger(photoZoom) ? `${photoZoom}x` : `${photoZoom.toFixed(1)}x`;

  function resetPhotoZoom() {
    setPhotoZoom(1);
    setPhotoOffset({ x: 0, y: 0 });
    setPhotoDragStart(null);
    shouldSkipNextClickRef.current = false;
  }

  function increasePhotoZoom() {
    const nextZoom = photoZoomLevels.find((zoom) => zoom > photoZoom);

    if (nextZoom) {
      setPhotoZoom(nextZoom);
    }
  }

  function decreasePhotoZoom() {
    const nextZoom = [...photoZoomLevels]
      .reverse()
      .find((zoom) => zoom < photoZoom);

    if (!nextZoom) {
      return;
    }

    if (nextZoom === 1) {
      resetPhotoZoom();
      return;
    }

    setPhotoZoom(nextZoom);
  }

  function clampPhotoOffset(
    offset: PhotoOffset,
    element: HTMLElement,
  ): PhotoOffset {
    const maxX = (element.clientWidth * (photoZoom - 1)) / 2;
    const maxY = (element.clientHeight * (photoZoom - 1)) / 2;

    return {
      x: Math.max(-maxX, Math.min(maxX, offset.x)),
      y: Math.max(-maxY, Math.min(maxY, offset.y)),
    };
  }

  function handlePhotoPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (!isPhotoMode || photoZoom <= 1) {
      return;
    }

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setPhotoDragStart({
      offsetX: photoOffset.x,
      offsetY: photoOffset.y,
      x: event.clientX,
      y: event.clientY,
    });
  }

  function handlePhotoPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!photoDragStart) {
      return;
    }

    const deltaX = event.clientX - photoDragStart.x;
    const deltaY = event.clientY - photoDragStart.y;

    if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) {
      shouldSkipNextClickRef.current = true;
    }

    setPhotoOffset(
      clampPhotoOffset(
        {
          x: photoDragStart.offsetX + deltaX,
          y: photoDragStart.offsetY + deltaY,
        },
        event.currentTarget,
      ),
    );
  }

  function handlePhotoPointerEnd(event: PointerEvent<HTMLDivElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    setPhotoDragStart(null);
  }

  return {
    photoZoom,
    photoOffset,
    isPhotoDragging,
    zoomLabel,
    resetPhotoZoom,
    increasePhotoZoom,
    decreasePhotoZoom,
    handlePhotoPointerDown,
    handlePhotoPointerMove,
    handlePhotoPointerEnd,
  };
}
