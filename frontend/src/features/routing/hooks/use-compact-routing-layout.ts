"use client";

import { useSyncExternalStore } from "react";

export const COMPACT_ROUTING_LAYOUT_QUERY = "(max-width: 1024px)";

function subscribe(callback: () => void) {
  const query = window.matchMedia(COMPACT_ROUTING_LAYOUT_QUERY);
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}

function getSnapshot() {
  return window.matchMedia(COMPACT_ROUTING_LAYOUT_QUERY).matches;
}

function getServerSnapshot() {
  return false;
}

export function useCompactRoutingLayout() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
