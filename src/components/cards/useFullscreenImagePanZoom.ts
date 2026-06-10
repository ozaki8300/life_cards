"use client";

import { useCallback, useRef, useState } from "react";
import type { MouseEvent, PointerEvent, TouchEvent } from "react";

type Offset = {
  x: number;
  y: number;
};

type PointerPosition = {
  x: number;
  y: number;
};

type GestureState = {
  distance: number;
  offset: Offset;
  scale: number;
  x: number;
  y: number;
};

const minScale = 1;
const maxScale = 5;
const doubleTapDelayMs = 280;
const doubleTapMaxDistance = 36;
const tapMoveTolerance = 10;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function distanceBetween(first: PointerPosition, second: PointerPosition) {
  return Math.hypot(first.x - second.x, first.y - second.y);
}

function centerBetween(first: PointerPosition, second: PointerPosition) {
  return {
    x: (first.x + second.x) / 2,
    y: (first.y + second.y) / 2,
  };
}

export default function useFullscreenImagePanZoom() {
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState<Offset>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const pointersRef = useRef(new Map<number, PointerPosition>());
  const gestureRef = useRef<GestureState | null>(null);
  const tapStartRef = useRef<PointerPosition | null>(null);
  const touchStartRef = useRef<PointerPosition | null>(null);
  const touchMovedRef = useRef(false);
  const touchHadMultipleTouchesRef = useRef(false);
  const lastTapAtRef = useRef(0);
  const lastTapPointRef = useRef<PointerPosition | null>(null);
  const movedDuringGestureRef = useRef(false);

  const clampOffset = useCallback((nextOffset: Offset, nextScale: number) => {
    const maxX = window.innerWidth * Math.max(nextScale - 1, 0) * 0.5;
    const maxY = window.innerHeight * Math.max(nextScale - 1, 0) * 0.5;

    return {
      x: clamp(nextOffset.x, -maxX, maxX),
      y: clamp(nextOffset.y, -maxY, maxY),
    };
  }, []);

  const reset = useCallback(() => {
    pointersRef.current.clear();
    gestureRef.current = null;
    tapStartRef.current = null;
    touchStartRef.current = null;
    touchMovedRef.current = false;
    touchHadMultipleTouchesRef.current = false;
    movedDuringGestureRef.current = false;
    lastTapAtRef.current = 0;
    lastTapPointRef.current = null;
    setScale(1);
    setOffset({ x: 0, y: 0 });
    setIsDragging(false);
  }, []);

  const zoomAtPoint = useCallback(
    (element: HTMLElement, point: PointerPosition) => {
      const nextScale = scale > minScale ? minScale : 2.5;

      if (nextScale === minScale) {
        setScale(1);
        setOffset({ x: 0, y: 0 });
        return;
      }

      const rect = element.getBoundingClientRect();
      const localX = point.x - rect.left;
      const localY = point.y - rect.top;
      const nextOffset = clampOffset(
        {
          x: (rect.width / 2 - localX) * (nextScale - 1),
          y: (rect.height / 2 - localY) * (nextScale - 1),
        },
        nextScale,
      );

      setScale(nextScale);
      setOffset(nextOffset);
    },
    [clampOffset, scale],
  );

  const handleDoubleTapCandidate = useCallback(
    (element: HTMLElement, point: PointerPosition) => {
      const now = Date.now();
      const lastPoint = lastTapPointRef.current;
      const isDoubleTap =
        lastPoint &&
        now - lastTapAtRef.current <= doubleTapDelayMs &&
        distanceBetween(lastPoint, point) <= doubleTapMaxDistance;

      if (isDoubleTap) {
        lastTapAtRef.current = 0;
        lastTapPointRef.current = null;
        zoomAtPoint(element, point);
        return true;
      }

      lastTapAtRef.current = now;
      lastTapPointRef.current = point;
      return false;
    },
    [zoomAtPoint],
  );

  function beginGesture() {
    const pointers = Array.from(pointersRef.current.values());

    if (pointers.length >= 2) {
      const center = centerBetween(pointers[0], pointers[1]);

      gestureRef.current = {
        distance: Math.max(distanceBetween(pointers[0], pointers[1]), 1),
        offset,
        scale,
        x: center.x,
        y: center.y,
      };
      setIsDragging(true);
      return;
    }

    if (pointers.length === 1) {
      gestureRef.current = {
        distance: 0,
        offset,
        scale,
        x: pointers[0].x,
        y: pointers[0].y,
      };
      setIsDragging(scale > minScale);
    }
  }

  function handlePointerDown(event: PointerEvent<HTMLElement>) {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    pointersRef.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });
    tapStartRef.current = {
      x: event.clientX,
      y: event.clientY,
    };
    movedDuringGestureRef.current = false;
    beginGesture();
  }

  function handlePointerMove(event: PointerEvent<HTMLElement>) {
    if (!pointersRef.current.has(event.pointerId)) {
      return;
    }

    pointersRef.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });

    const gesture = gestureRef.current;
    const pointers = Array.from(pointersRef.current.values());

    if (!gesture || pointers.length === 0) {
      return;
    }

    if (tapStartRef.current) {
      const travel = distanceBetween(tapStartRef.current, {
        x: event.clientX,
        y: event.clientY,
      });

      if (travel > 8) {
        movedDuringGestureRef.current = true;
      }
    }

    if (pointers.length >= 2) {
      movedDuringGestureRef.current = true;
      const center = centerBetween(pointers[0], pointers[1]);
      const nextScale = clamp(
        gesture.scale * (distanceBetween(pointers[0], pointers[1]) / gesture.distance),
        minScale,
        maxScale,
      );
      const nextOffset =
        nextScale === minScale
          ? { x: 0, y: 0 }
          : clampOffset(
              {
                x: gesture.offset.x + center.x - gesture.x,
                y: gesture.offset.y + center.y - gesture.y,
              },
              nextScale,
            );

      setScale(nextScale);
      setOffset(nextOffset);
      return;
    }

    if (scale <= minScale) {
      return;
    }

    setOffset(
      clampOffset(
        {
          x: gesture.offset.x + event.clientX - gesture.x,
          y: gesture.offset.y + event.clientY - gesture.y,
        },
        scale,
      ),
    );
  }

  function handlePointerEnd(event: PointerEvent<HTMLElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    const wasTap = !movedDuringGestureRef.current;

    pointersRef.current.delete(event.pointerId);

    if (pointersRef.current.size > 0) {
      beginGesture();
      return;
    }

    gestureRef.current = null;
    tapStartRef.current = null;
    setIsDragging(false);

    if (!wasTap) {
      return;
    }

    if (event.pointerType !== "touch" && event.pointerType !== "mouse") {
      handleDoubleTapCandidate(event.currentTarget, {
        x: event.clientX,
        y: event.clientY,
      });
      return;
    }
  }

  function handleTouchStart(event: TouchEvent<HTMLElement>) {
    if (event.touches.length > 1) {
      touchHadMultipleTouchesRef.current = true;
      touchStartRef.current = null;
      return;
    }

    const touch = event.touches[0];

    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
    };
    touchMovedRef.current = false;
    touchHadMultipleTouchesRef.current = false;
  }

  function handleTouchMove(event: TouchEvent<HTMLElement>) {
    if (event.touches.length > 1) {
      touchHadMultipleTouchesRef.current = true;
      touchMovedRef.current = true;
      return;
    }

    const startPoint = touchStartRef.current;
    const touch = event.touches[0];

    if (!startPoint || !touch) {
      return;
    }

    if (
      distanceBetween(startPoint, {
        x: touch.clientX,
        y: touch.clientY,
      }) > tapMoveTolerance
    ) {
      touchMovedRef.current = true;
    }
  }

  function handleTouchEnd(event: TouchEvent<HTMLElement>) {
    if (
      touchHadMultipleTouchesRef.current ||
      touchMovedRef.current ||
      event.touches.length > 0 ||
      event.changedTouches.length !== 1
    ) {
      touchStartRef.current = null;
      return;
    }

    const touch = event.changedTouches[0];
    const wasDoubleTap = handleDoubleTapCandidate(event.currentTarget, {
      x: touch.clientX,
      y: touch.clientY,
    });

    touchStartRef.current = null;

    if (wasDoubleTap) {
      event.preventDefault();
      event.stopPropagation();
    }
  }

  function handleDoubleClick(event: MouseEvent<HTMLElement>) {
    event.preventDefault();
    event.stopPropagation();
    zoomAtPoint(event.currentTarget, {
      x: event.clientX,
      y: event.clientY,
    });
  }

  return {
    isDragging,
    offset,
    reset,
    scale,
    handlePointerCancel: handlePointerEnd,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp: handlePointerEnd,
    handleTouchEnd,
    handleTouchMove,
    handleTouchStart,
    handleDoubleClick,
  };
}
