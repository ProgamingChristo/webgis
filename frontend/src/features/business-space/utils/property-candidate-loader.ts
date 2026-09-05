import type { CandidateQuery } from "../services/business-space.service";
import type { BusinessSpaceCandidate, BusinessSpaceCandidateList } from "../types/business-space.types";

const PAGE_SIZE = 24;
const MAX_OFFSET = 500;
const DEBOUNCE_MS = 250;

export interface PropertyCandidateState {
  candidates: BusinessSpaceCandidate[];
  totalAvailable: number;
  totalIsExact: boolean;
  searchTruncated: boolean;
  hasMore: boolean;
  refineArea: boolean;
  limitations: string[];
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
}

type FetchCandidates = (query: CandidateQuery, signal?: AbortSignal) => Promise<BusinessSpaceCandidateList>;

const initialState = (): PropertyCandidateState => ({
  candidates: [], totalAvailable: 0, totalIsExact: true, searchTruncated: false, hasMore: false, refineArea: false,
  limitations: [], loading: false, loadingMore: false, error: null,
});

/** Owns one viewport's requests. A cancelled response can never publish to a later viewport. */
export function createPropertyCandidateLoader(fetchCandidates: FetchCandidates) {
  let state = initialState();
  let query: CandidateQuery | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let controller: AbortController | null = null;
  let requestId = 0;
  let nextOffset = 0;
  const listeners = new Set<() => void>();

  function publish(next: PropertyCandidateState) {
    state = next;
    for (const listener of listeners) listener();
  }

  function cancel() {
    requestId += 1;
    clearTimeout(timer);
    controller?.abort();
    controller = null;
  }

  async function request(append: boolean) {
    if (!query) return;
    cancel();
    const currentRequest = requestId;
    const currentController = new AbortController();
    controller = currentController;
    const offset = append ? nextOffset : 0;
    publish({ ...state, loading: !append, loadingMore: append, error: null });
    try {
      const result = await fetchCandidates({ ...query, limit: PAGE_SIZE, offset }, currentController.signal);
      if (currentController.signal.aborted || requestId !== currentRequest) return;
      const byId = new Map((append ? state.candidates : []).map((item) => [item.id, item]));
      for (const candidate of result.candidates) byId.set(candidate.id, candidate);
      nextOffset = result.offset + result.candidates.length;
      const canAdvance = result.candidates.length > 0 && nextOffset <= MAX_OFFSET;
      publish({
        candidates: [...byId.values()],
        totalAvailable: result.total_available,
        totalIsExact: result.total_is_exact !== false,
        searchTruncated: result.search_truncated === true,
        hasMore: result.has_more && canAdvance,
        refineArea: result.search_truncated === true || (result.has_more && !canAdvance),
        limitations: result.limitations,
        loading: false,
        loadingMore: false,
        error: null,
      });
    } catch (cause) {
      if (currentController.signal.aborted || requestId !== currentRequest) return;
      publish({
        ...state, loading: false, loadingMore: false,
        error: cause instanceof Error ? cause.message : "Properti di area ini belum dapat dimuat. Coba lagi.",
      });
    }
  }

  return {
    getSnapshot: () => state,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    setQuery(next: CandidateQuery | null) {
      cancel();
      query = next;
      nextOffset = 0;
      // Clear the previous area immediately; an empty result must not leave old markers on screen.
      publish({ ...initialState(), loading: next !== null });
      if (next) timer = setTimeout(() => { void request(false); }, DEBOUNCE_MS);
    },
    refresh() {
      if (query) {
        nextOffset = 0;
        publish({ ...initialState(), loading: true });
        void request(false);
      }
    },
    loadMore() {
      if (state.hasMore && !state.loading && !state.loadingMore) void request(true);
    },
    cancel,
  };
}
