"use client";
import { useSyncExternalStore } from "react";
import { DEFAULT_BASEMAP_ID, getPreferredBasemapId, persistBasemapPreference, type BasemapId } from "./mapid";
let basemapId: BasemapId | undefined;
function snapshot() { return basemapId ??= getPreferredBasemapId(); }
function subscribe(listener: () => void) {
  const refresh = () => { basemapId = getPreferredBasemapId(); listener(); };
  window.addEventListener("getra:basemap", refresh);
  window.addEventListener("storage", refresh);
  return () => { window.removeEventListener("getra:basemap", refresh); window.removeEventListener("storage", refresh); };
}
export function switchBasemap(id: BasemapId) { basemapId = id; persistBasemapPreference(id); }
export function useBasemap() { return [useSyncExternalStore(subscribe, snapshot, () => DEFAULT_BASEMAP_ID), switchBasemap] as const; }
