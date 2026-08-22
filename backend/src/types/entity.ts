export interface BaseEntity {
  id: string;
  created_at: string;
  updated_at: string;
}

/**
 * Canonical repository pagination. `offset` is zero-based and must remain
 * consistent with the Phase 3 page/limit contract.
 */
export interface RepositoryPagination {
  page: number;
  limit: number;
  offset: number;
}

export const SORT_DIRECTIONS = ["asc", "desc"] as const;

export type SortDirection = (typeof SORT_DIRECTIONS)[number];

export interface RepositorySort<TField extends string> {
  sort: TField;
  order: SortDirection;
}

export interface RepositoryPage<T> extends RepositoryPagination {
  items: T[];
  total: number;
}
