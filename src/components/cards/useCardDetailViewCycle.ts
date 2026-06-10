"use client";

import { useState } from "react";

const viewModes = ["front", "back"] as const;
type ViewMode = (typeof viewModes)[number];

export default function useCardDetailViewCycle() {
  const [rotationStep, setRotationStep] = useState(0);
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

  return {
    viewMode,
    rotationAngle,
    frontFaceStep,
    backFaceStep,
    cycleViewMode,
  };
}
