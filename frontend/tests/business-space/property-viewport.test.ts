import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CandidateQuery } from "@/src/features/business-space/services/business-space.service";
import type { BusinessSpaceCandidate, BusinessSpaceCandidateList, BusinessSpaceViewport } from "@/src/features/business-space/types/business-space.types";
import { createPropertyCandidateLoader } from "@/src/features/business-space/utils/property-candidate-loader";
import { isPropertyViewportTooWide, normalizePropertyViewport } from "@/src/features/business-space/utils/property-viewport";
import { subscribePropertyViewport, syncBusinessSpaceMap } from "@/src/features/business-space/utils/property-map";

const firstBounds = { west: 106.75, south: -6.3, east: 106.9, north: -6.1 };
const nextBounds = { west: 106.9, south: -6.3, east: 107.05, north: -6.1 };
const query: CandidateQuery = { category: "bakso", days: 30, bbox: firstBounds };

function candidate(id: string): BusinessSpaceCandidate {
  return {
    id, source_id: id, longitude: 106.82, latitude: -6.2,
    property_category: "Ruko", property_transaction_type: "DISEWA", address: "Jl. Contoh",
    facade_photo_url: null, banner_photo_url: null, observed_at: null, imported_at: null,
    freshness: "UNKNOWN", availability: "UNKNOWN_FRESHNESS",
    provenance: { provider: "MAPID", source_type: "PROPERTI_GO", source_id: id, imported_at: null },
  };
}

function result(ids: string[], options: Partial<BusinessSpaceCandidateList> = {}): BusinessSpaceCandidateList {
  return {
    candidates: ids.map(candidate), category_slug: "bakso", days: 30,
    total_available: ids.length, limit: 24, offset: 0, has_more: false, limitations: [],
    ...options,
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (cause: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

describe("Properti Go viewport requests", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("waits for real bounds and debounces movement to the latest visible area", async () => {
    const fetch = vi.fn().mockResolvedValue(result(["new-area"]));
    const loader = createPropertyCandidateLoader(fetch);
    loader.setQuery(null);
    await vi.advanceTimersByTimeAsync(300);
    expect(fetch).not.toHaveBeenCalled();
    loader.setQuery(query);
    await vi.advanceTimersByTimeAsync(150);
    loader.setQuery({ ...query, bbox: nextBounds });
    await vi.advanceTimersByTimeAsync(249);
    expect(fetch).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(fetch).toHaveBeenCalledExactlyOnceWith(
      { category: "bakso", days: 30, bbox: nextBounds, limit: 24, offset: 0 }, expect.any(AbortSignal),
    );
    expect(loader.getSnapshot().candidates.map((item) => item.id)).toEqual(["new-area"]);
  });

  it("aborts a previous area and rejects its late response even if transport ignores abort", async () => {
    const old = deferred<BusinessSpaceCandidateList>();
    const current = deferred<BusinessSpaceCandidateList>();
    const fetch = vi.fn().mockReturnValueOnce(old.promise).mockReturnValueOnce(current.promise);
    const loader = createPropertyCandidateLoader(fetch);
    loader.setQuery(query);
    await vi.advanceTimersByTimeAsync(250);
    const oldSignal = fetch.mock.calls[0][1] as AbortSignal;
    loader.setQuery({ ...query, bbox: nextBounds });
    expect(oldSignal.aborted).toBe(true);
    await vi.advanceTimersByTimeAsync(250);
    old.resolve(result(["stale"]));
    await vi.advanceTimersByTimeAsync(0);
    expect(loader.getSnapshot()).toMatchObject({ candidates: [], loading: true });
    current.resolve(result(["current"]));
    await vi.advanceTimersByTimeAsync(0);
    expect(loader.getSnapshot()).toMatchObject({ loading: false, error: null });
    expect(loader.getSnapshot().candidates.map((item) => item.id)).toEqual(["current"]);
  });

  it("clears the previous area's list and markers while loading and after an empty response", async () => {
    const fetch = vi.fn().mockResolvedValueOnce(result(["first-area"])).mockResolvedValueOnce(result([]));
    const loader = createPropertyCandidateLoader(fetch);
    loader.setQuery(query);
    await vi.advanceTimersByTimeAsync(250);
    loader.setQuery({ ...query, bbox: nextBounds });
    expect(loader.getSnapshot().candidates).toEqual([]);
    await vi.advanceTimersByTimeAsync(250);
    expect(loader.getSnapshot()).toMatchObject({ candidates: [], totalAvailable: 0, loading: false, hasMore: false });
  });

  it("appends pages from the same viewport, deduplicates properties and restarts pagination after a filter change", async () => {
    const fetch = vi.fn()
      .mockResolvedValueOnce(result(["one", "two"], { total_available: 3, has_more: true }))
      .mockResolvedValueOnce(result(["two", "three"], { total_available: 3, offset: 2 }))
      .mockResolvedValueOnce(result(["filtered"]));
    const loader = createPropertyCandidateLoader(fetch);
    loader.setQuery(query);
    await vi.advanceTimersByTimeAsync(250);
    loader.loadMore();
    expect(loader.getSnapshot().loadingMore).toBe(true);
    await vi.advanceTimersByTimeAsync(0);
    expect(fetch.mock.calls[1][0]).toMatchObject({ bbox: firstBounds, offset: 2 });
    expect(loader.getSnapshot().candidates.map((item) => item.id)).toEqual(["one", "two", "three"]);
    loader.setQuery({ ...query, property_category: "Tanah", transaction_type: "DIJUAL", q: "Pondok" });
    await vi.advanceTimersByTimeAsync(250);
    expect(fetch.mock.calls[2][0]).toMatchObject({ bbox: firstBounds, offset: 0, property_category: "Tanah", transaction_type: "DIJUAL", q: "Pondok" });
    expect(loader.getSnapshot().candidates.map((item) => item.id)).toEqual(["filtered"]);
  });

  it("discards a pending extra page when the map moves", async () => {
    const page = deferred<BusinessSpaceCandidateList>();
    const fetch = vi.fn()
      .mockResolvedValueOnce(result(["first-area"], { has_more: true }))
      .mockReturnValueOnce(page.promise)
      .mockResolvedValueOnce(result(["new-area"]));
    const loader = createPropertyCandidateLoader(fetch);
    loader.setQuery(query);
    await vi.advanceTimersByTimeAsync(250);
    loader.loadMore();
    loader.setQuery({ ...query, bbox: nextBounds });
    await vi.advanceTimersByTimeAsync(250);
    page.resolve(result(["old-extra"], { offset: 1 }));
    await vi.advanceTimersByTimeAsync(0);
    expect(loader.getSnapshot().candidates.map((item) => item.id)).toEqual(["new-area"]);
  });

  it("respects the API offset cap and asks for a smaller area when more records remain", async () => {
    const fetch = vi.fn(async (requested: CandidateQuery) => result(
      Array.from({ length: 24 }, (_, index) => `property-${(requested.offset ?? 0) + index}`),
      { offset: requested.offset ?? 0, has_more: true, total_available: 700 },
    ));
    const loader = createPropertyCandidateLoader(fetch);
    loader.setQuery(query);
    await vi.advanceTimersByTimeAsync(250);
    for (let index = 0; index < 21; index += 1) {
      loader.loadMore();
      await vi.advanceTimersByTimeAsync(0);
    }
    expect(fetch.mock.calls.every(([requested]) => requested.offset! <= 500)).toBe(true);
    expect(loader.getSnapshot()).toMatchObject({ hasMore: false, refineArea: true });
    expect(loader.getSnapshot().candidates).toHaveLength(504);
  });

  it("shows request errors and retries the same area without keeping a false empty-success state", async () => {
    const fetch = vi.fn().mockRejectedValueOnce(new Error("Koneksi terputus")).mockResolvedValueOnce(result(["retry"]));
    const loader = createPropertyCandidateLoader(fetch);
    loader.setQuery(query);
    await vi.advanceTimersByTimeAsync(250);
    expect(loader.getSnapshot()).toMatchObject({ loading: false, error: "Koneksi terputus" });
    loader.refresh();
    await vi.advanceTimersByTimeAsync(0);
    expect(loader.getSnapshot()).toMatchObject({ error: null, loading: false });
    expect(loader.getSnapshot().candidates.map((item) => item.id)).toEqual(["retry"]);
  });

  it("preserves an incomplete-search signal instead of treating a bounded empty scan as exhaustive", async () => {
    const fetch = vi.fn().mockResolvedValue(result([], { total_is_exact: false, search_truncated: true }));
    const loader = createPropertyCandidateLoader(fetch);
    loader.setQuery({ ...query, q: "Ruko" });
    await vi.advanceTimersByTimeAsync(250);
    expect(loader.getSnapshot()).toMatchObject({
      candidates: [], totalAvailable: 0, totalIsExact: false, searchTruncated: true, refineArea: true, hasMore: false,
    });
  });

  it("cancels on unmount and supports a new subscription after Strict Mode cleanup", async () => {
    const pending = deferred<BusinessSpaceCandidateList>();
    const fetch = vi.fn().mockReturnValueOnce(pending.promise).mockResolvedValueOnce(result(["remounted"]));
    const loader = createPropertyCandidateLoader(fetch);
    const listener = vi.fn();
    const unsubscribe = loader.subscribe(listener);
    loader.setQuery(query);
    await vi.advanceTimersByTimeAsync(250);
    loader.cancel();
    unsubscribe();
    const notificationsBefore = listener.mock.calls.length;
    pending.reject(new Error("Late failure"));
    await vi.advanceTimersByTimeAsync(0);
    expect(listener).toHaveBeenCalledTimes(notificationsBefore);
    loader.setQuery(query);
    await vi.advanceTimersByTimeAsync(250);
    expect(loader.getSnapshot().candidates.map((item) => item.id)).toEqual(["remounted"]);
  });
});

describe("Properti Go map bounds and markers", () => {
  it("preserves the visible extent and requests zoom-in for a viewport beyond API limits", () => {
    const wide = { west: 106, south: -7, east: 108, north: -5 };
    expect(normalizePropertyViewport(firstBounds)).toEqual(firstBounds);
    expect(normalizePropertyViewport(wide)).toEqual(wide);
    expect(isPropertyViewportTooWide(wide)).toBe(true);
    expect(isPropertyViewportTooWide(firstBounds)).toBe(false);
    expect(normalizePropertyViewport({ ...firstBounds, east: Number.NaN })).toBeNull();
    expect(normalizePropertyViewport({ ...firstBounds, east: 106 })).toBeNull();
  });

  it("emits actual initial and moved map bounds and removes its listener during cleanup", () => {
    let bounds: BusinessSpaceViewport = firstBounds;
    let move: (() => void) | undefined;
    const map = {
      getBounds: () => ({ getWest: () => bounds.west, getSouth: () => bounds.south, getEast: () => bounds.east, getNorth: () => bounds.north }),
      on: vi.fn((_event: string, listener: () => void) => { move = listener; }),
      off: vi.fn(),
    };
    const listener = vi.fn();
    const cleanup = subscribePropertyViewport(map as never, listener);
    expect(listener).toHaveBeenLastCalledWith(firstBounds);
    bounds = nextBounds;
    move?.();
    expect(listener).toHaveBeenLastCalledWith(nextBounds);
    cleanup();
    expect(map.off).toHaveBeenCalledWith("moveend", move);
  });

  it("updates selection and results without fitting bounds, and removes old points on an empty result", () => {
    const setData = vi.fn();
    const map = { getSource: vi.fn(() => ({ setData })), fitBounds: vi.fn(), flyTo: vi.fn() };
    syncBusinessSpaceMap(map as never, { candidates: [candidate("one"), candidate("two")], selectedId: "two", comparison: [] });
    expect(setData.mock.calls[0][0].features).toEqual(expect.arrayContaining([
      expect.objectContaining({ properties: { id: "two", selected: true, comparison: false } }),
    ]));
    syncBusinessSpaceMap(map as never, { candidates: [], selectedId: null, comparison: [] });
    expect(setData).toHaveBeenLastCalledWith({ type: "FeatureCollection", features: [] });
    expect(map.fitBounds).not.toHaveBeenCalled();
    expect(map.flyTo).not.toHaveBeenCalled();
  });
});
