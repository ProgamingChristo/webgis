import "server-only";

import type {
  SupabaseClient,
} from "@supabase/supabase-js";

import {
  mapProfileRow,
} from "@/src/mappers/profile.mapper";

import {
  assertRepositoryPagination,
  type ReadRepository,
  type RepositoryPage,
} from "@/src/repositories/contracts";

import {
  mapDatabaseError,
  RepositoryError,
} from "@/src/repositories/errors";

import type {
  ProfileDatabaseRow,
  ProfileDTO,
  ProfileFilters,
  ProfileListQuery,
  ProfileUpdateData,
} from "@/src/types/profile";

const PROFILE_COLUMNS =
  "id, display_name, avatar_url, account_role, trust_score, onboarding_complete, created_at, updated_at";

export class ProfileRepository
  implements
    ReadRepository<
      ProfileDTO,
      ProfileListQuery,
      ProfileFilters
    >
{
  constructor(
    private readonly supabase:
      SupabaseClient,
  ) {}

  async findById(
    userId: string,
  ): Promise<ProfileDTO | null> {
    const {
      data,
      error,
    } = await this.supabase
      .from("profiles")
      .select(PROFILE_COLUMNS)
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      throw mapDatabaseError(
        error,
        "profiles.findById",
      );
    }

    return data
      ? mapProfileRow(
          data as ProfileDatabaseRow,
        )
      : null;
  }

  async getProfileById(
    userId: string,
  ): Promise<ProfileDTO | null> {
    return this.findById(userId);
  }

  async findMany(
    queryOptions: ProfileListQuery,
  ): Promise<
    RepositoryPage<ProfileDTO>
  > {
    const pagination =
      assertRepositoryPagination(
        queryOptions,
      );

    let query = this.supabase
      .from("profiles")
      .select(
        PROFILE_COLUMNS,
        {
          count: "exact",
        },
      );

    if (
      queryOptions.account_role
    ) {
      query = query.eq(
        "account_role",
        queryOptions.account_role,
      );
    }

    const {
      data,
      error,
      count,
    } = await query
      .order(
        queryOptions.sort,
        {
          ascending:
            queryOptions.order ===
            "asc",
        },
      )
      .range(
        pagination.offset,
        pagination.offset +
          pagination.limit -
          1,
      );

    if (error) {
      throw mapDatabaseError(
        error,
        "profiles.findMany",
      );
    }

    return {
      ...pagination,

      items: (
        data ?? []
      ).map(
        (row) =>
          mapProfileRow(
            row as ProfileDatabaseRow,
          ),
      ),

      total:
        count ?? 0,
    };
  }

  async exists(
    userId: string,
  ): Promise<boolean> {
    const {
      count,
      error,
    } = await this.supabase
      .from("profiles")
      .select(
        "id",
        {
          count: "exact",
          head: true,
        },
      )
      .eq("id", userId);

    if (error) {
      throw mapDatabaseError(
        error,
        "profiles.exists",
      );
    }

    return (
      count ?? 0
    ) > 0;
  }

  async count(
    filters:
      ProfileFilters = {},
  ): Promise<number> {
    let query = this.supabase
      .from("profiles")
      .select(
        "id",
        {
          count: "exact",
          head: true,
        },
      );

    if (
      filters.account_role
    ) {
      query = query.eq(
        "account_role",
        filters.account_role,
      );
    }

    const {
      count,
      error,
    } = await query;

    if (error) {
      throw mapDatabaseError(
        error,
        "profiles.count",
      );
    }

    return count ?? 0;
  }

  async update(
    userId: string,
    updateData:
      ProfileUpdateData,
  ): Promise<ProfileDTO> {
    const {
      data,
      error,
    } = await this.supabase
      .from("profiles")
      .update(updateData)
      .eq("id", userId)
      .select(PROFILE_COLUMNS)
      .maybeSingle();

    if (error) {
      throw mapDatabaseError(
        error,
        "profiles.update",
      );
    }

    if (!data) {
      throw new RepositoryError(
        "NOT_FOUND",
        "profiles.update",
      );
    }

    return mapProfileRow(
      data as ProfileDatabaseRow,
    );
  }

  async updateProfile(
    userId: string,
    updateData:
      ProfileUpdateData,
  ): Promise<ProfileDTO> {
    return this.update(
      userId,
      updateData,
    );
  }
}