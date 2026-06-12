"use client";

import { useState } from "react";

const viewModes = ["front", "back"] as const;
type ViewMode = (typeof viewModes)[number];

export type CardDetailViewMode = ViewMode;

export default function useCardDetailViewCycle(
  initialViewMode: CardDetailViewMode = "front",
) {
  const [rotationStep, setRotationStep] = useState(
    () => viewModes.indexOf(initialViewMode),
  );
  const viewMode: ViewMode = viewModes[rotationStep % viewModes.length];
  const rotationAngle = rotationStep * 180;
  const currentViewIndex = rotationStep % viewModes.length;

  function faceStepFor(viewIndex: number) {
    const delta =
      (viewIndex - currentViewIndex + viewModes.length) % viewModes.length;

    return rotationStep + delta;
  }

  const frontFaceStep = faceStepFor(0);
  const backFaceStep = faceStepFor(1);

  function cycleViewMode() {
    setRotationStep((current) => current + 1);
  }

  function setViewMode(nextViewMode: CardDetailViewMode) {
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

  return {
    viewMode,
    rotationAngle,
    frontFaceStep,
    backFaceStep,
    cycleViewMode,
    returnToFront,
    setViewMode,
  };
}
