"use client";

import { useState } from "react";

const viewModes = ["front", "back"] as const;
type ViewMode = (typeof viewModes)[number] | "photo";

type UseCardDetailViewCycleInput = {
  resetPhotoZoom: () => void;
};

export default function useCardDetailViewCycle({
  resetPhotoZoom,
}: UseCardDetailViewCycleInput) {
  const [rotationStep, setRotationStep] = useState(0);
  const [isPhotoMode, setIsPhotoMode] = useState(false);
  const cardViewMode = viewModes[rotationStep % viewModes.length];
  const viewMode: ViewMode = isPhotoMode ? "photo" : cardViewMode;
  const rotationAngle = rotationStep * 180;
  const currentViewIndex = rotationStep % viewModes.length;

  function faceStepFor(viewIndex: number) {
    const delta =
      (viewIndex - currentViewIndex + viewModes.length) % viewModes.length;

    return rotationStep + delta;
  }

  const frontFaceStep = faceStepFor(0);
  const backFaceStep = faceStepFor(1);
  function showFront() {
    resetPhotoZoom();
    setIsPhotoMode(false);
    setRotationStep((current) => {
      const currentIndex = current % viewModes.length;
      const delta = (0 - currentIndex + viewModes.length) % viewModes.length;

      return current + (delta || viewModes.length);
    });
  }

  function showPhoto() {
    resetPhotoZoom();
    setIsPhotoMode(true);
  }

  function cycleViewMode() {
    if (isPhotoMode) {
      return;
    }

    setIsPhotoMode(false);
    setRotationStep((current) => current + 1);
  }

  return {
    viewMode,
    rotationAngle,
    frontFaceStep,
    backFaceStep,
    showFront,
    showPhoto,
    cycleViewMode,
  };
}
