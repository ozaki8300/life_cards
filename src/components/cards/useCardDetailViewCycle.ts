"use client";

import { useEffect, useRef, useState } from "react";

const viewModes = ["front", "back"] as const;
type ViewMode = (typeof viewModes)[number];

export type CardDetailViewMode = ViewMode;

export default function useCardDetailViewCycle(
  initialViewMode: CardDetailViewMode = "front",
) {
  const initialRotationStep = viewModes.indexOf(initialViewMode);
  const [rotationStep, setRotationStep] = useState(
    () => initialRotationStep,
  );
  const visibleViewModeRef = useRef<ViewMode>(viewModes[initialRotationStep]);
  const viewMode: ViewMode = viewModes[rotationStep % viewModes.length];
  const rotationAngle = rotationStep * 180;
  const currentViewIndex = rotationStep % viewModes.length;

  useEffect(() => {
    visibleViewModeRef.current = viewMode;
  }, [viewMode]);

  function faceStepFor(viewIndex: number) {
    const delta =
      (viewIndex - currentViewIndex + viewModes.length) % viewModes.length;

    return rotationStep + delta;
  }

  const frontFaceStep = faceStepFor(0);
  const backFaceStep = faceStepFor(1);

  function cycleViewMode() {
    const nextViewMode =
      visibleViewModeRef.current === "front" ? "back" : "front";

    visibleViewModeRef.current = nextViewMode;
    setRotationStep((current) => current + 1);
  }

  function setViewMode(nextViewMode: CardDetailViewMode) {
    visibleViewModeRef.current = nextViewMode;
    setRotationStep((current) => {
      const currentViewIndex = current % viewModes.length;
      const nextViewIndex = viewModes.indexOf(nextViewMode);
      const delta =
        (nextViewIndex - currentViewIndex + viewModes.length) %
        viewModes.length;

      return current + delta;
    });
  }

  function returnToFront() {
    setViewMode("front");
  }

  function isShowingBack() {
    return visibleViewModeRef.current === "back";
  }

  return {
    viewMode,
    rotationAngle,
    frontFaceStep,
    backFaceStep,
    cycleViewMode,
    isShowingBack,
    returnToFront,
    setViewMode,
  };
}
