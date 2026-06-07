"use client";

import { useState } from "react";

const viewModes = ["front", "back", "photo"] as const;

type UseCardDetailViewCycleInput = {
  resetPhotoZoom: () => void;
};

export default function useCardDetailViewCycle({
  resetPhotoZoom,
}: UseCardDetailViewCycleInput) {
  const [rotationStep, setRotationStep] = useState(0);
  const viewMode = viewModes[rotationStep % viewModes.length];
  const rotationAngle = rotationStep * 180;
  const currentViewIndex = rotationStep % viewModes.length;

  function faceStepFor(viewIndex: number) {
    const delta =
      (viewIndex - currentViewIndex + viewModes.length) % viewModes.length;

    return rotationStep + delta;
  }

  const frontFaceStep = faceStepFor(0);
  const backFaceStep = faceStepFor(1);
  const photoFaceStep = faceStepFor(2);

  function showFront() {
    resetPhotoZoom();
    setRotationStep((current) => {
      const currentIndex = current % viewModes.length;
      const delta = (0 - currentIndex + viewModes.length) % viewModes.length;

      return current + (delta || viewModes.length);
    });
  }

  function cycleViewMode(photoZoom: number) {
    if (viewMode === "photo" && photoZoom > 1) {
      return;
    }

    if (viewMode === "back" || viewMode === "photo") {
      resetPhotoZoom();
    }

    setRotationStep((current) => current + 1);
  }

  return {
    viewMode,
    rotationAngle,
    frontFaceStep,
    backFaceStep,
    photoFaceStep,
    showFront,
    cycleViewMode,
  };
}
