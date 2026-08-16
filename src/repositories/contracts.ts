import type { RepositoryPage, RepositoryPagination } from "@/src/types/entity";

export type {
  RepositoryPage,
  RepositoryPagination,
  SortDirection,
} from "@/src/types/entity";

export interface ReadRepository<TEntity, TListQuery, TFilters> {
  findById(id: string): Promise<TEntity | null>;
  findMany(query: TListQuery): Promise<RepositoryPage<TEntity>>;
  exists(id: string): Promise<boolean>;
  count(filters?: TFilters): Promise<number>;
}

export interface WriteRepository<TEntity, TCreateInput, TUpdateInput> {
  create(input: TCreateInput): Promise<TEntity>;
  update(id: string, input: TUpdateInput): Promise<TEntity>;
}

export function assertRepositoryPagination(
  pagination: RepositoryPagination,
): RepositoryPagination {
  if (
    !Number.isSafeInteger(pagination.page) ||
    pagination.page < 1 ||
    !Number.isSafeInteger(pagination.limit) ||
    pagination.limit < 1 ||
    pagination.limit > 100 ||
    !Number.isSafeInteger(pagination.offset) ||
    pagination.offset < 0
  ) {
    throw new TypeError("Invalid repository pagination");
  }

  return {
    limit: pagination.limit,
    offset: pagination.offset,
    page: pagination.page,
  };
}
