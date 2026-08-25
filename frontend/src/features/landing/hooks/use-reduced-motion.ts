"use client";

import { useSyncExternalStore } from "react";

const QUERY =
  "(prefers-reduced-motion: reduce)";

function subscribe(
  callback: () => void,
) {
  const query =
    window.matchMedia(QUERY);

  query.addEventListener(
    "change",
    callback,
  );

  return () => {
    query.removeEventListener(
      "change",
      callback,
    );
  };
}

function getSnapshot() {
  return window.matchMedia(QUERY)
    .matches;
}

function getServerSnapshot() {
  return false;
}

export function useReducedMotion() {
  return useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );
}
