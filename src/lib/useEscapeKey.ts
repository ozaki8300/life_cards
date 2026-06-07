"use client";

import { useEffect, useRef } from "react";
import type { MutableRefObject } from "react";

type EscapeHandler = (event: KeyboardEvent) => void;

type EscapeEntry = {
  enabled: boolean;
  handlerRef: MutableRefObject<EscapeHandler>;
  ignoreEditable: boolean;
};

type EscapeOptions = {
  enabled?: boolean;
  ignoreEditable?: boolean;
};

const escapeEntries: EscapeEntry[] = [];
let isListening = false;

function isEditableElement(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return Boolean(target.closest("input, textarea, select, [contenteditable='true']"));
}

function stopEscape(event: KeyboardEvent) {
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
}

function handleEscapeKey(event: KeyboardEvent) {
  if (event.key !== "Escape") {
    return;
  }

  for (let index = escapeEntries.length - 1; index >= 0; index -= 1) {
    const entry = escapeEntries[index];

    if (!entry.enabled) {
      continue;
    }

    if (entry.ignoreEditable && isEditableElement(event.target)) {
      stopEscape(event);
      return;
    }

    stopEscape(event);
    entry.handlerRef.current(event);
    return;
  }
}

function ensureListener() {
  if (isListening || typeof window === "undefined") {
    return;
  }

  window.addEventListener("keydown", handleEscapeKey, { capture: true });
  isListening = true;
}

function cleanupListener() {
  if (escapeEntries.length > 0 || !isListening || typeof window === "undefined") {
    return;
  }

  window.removeEventListener("keydown", handleEscapeKey, { capture: true });
  isListening = false;
}

export function useEscapeKey(
  onEscape: EscapeHandler,
  { enabled = true, ignoreEditable = true }: EscapeOptions = {},
) {
  const handlerRef = useRef(onEscape);
  const entryRef = useRef<EscapeEntry | null>(null);

  useEffect(() => {
    handlerRef.current = onEscape;
  }, [onEscape]);

  useEffect(() => {
    const entry: EscapeEntry = {
      enabled: false,
      handlerRef,
      ignoreEditable: true,
    };

    entryRef.current = entry;
    escapeEntries.push(entry);
    ensureListener();

    return () => {
      const index = escapeEntries.indexOf(entry);

      if (index >= 0) {
        escapeEntries.splice(index, 1);
      }

      if (entryRef.current === entry) {
        entryRef.current = null;
      }

      cleanupListener();
    };
  }, []);

  useEffect(() => {
    if (!entryRef.current) {
      return;
    }

    entryRef.current.enabled = enabled;
    entryRef.current.ignoreEditable = ignoreEditable;
  }, [enabled, ignoreEditable]);
}
