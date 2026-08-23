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
  PublicStakeholderMode,
  PublicProfileDTO,
  ProfileUpdateData,
} from "@/src/types/profile";

const PROFILE_COLUMNS =
  "id, display_name, username, avatar_url, phone_number, bio, account_role, trust_score, onboarding_complete, created_at, updated_at";

const PUBLIC_PROFILE_COLUMNS =
  PROFILE_COLUMNS;

function toPublicProfile(
  profile: ProfileDTO,
  stakeholderModes:
    PublicStakeholderMode[] = [],
): PublicProfileDTO {
  return {
    id: profile.id,
    display_name: profile.display_name,
    username: profile.username,
    avatar_url: profile.avatar_url,
    bio: profile.bio,
    account_role: profile.account_role,
    trust_score: profile.trust_score,
    created_at: profile.created_at,
    stakeholder_modes:
      stakeholderModes,
  };
}

function isPublicStakeholderMode(
  value: unknown,
): value is PublicStakeholderMode {
  return (
    value === "UMKM" ||
    value === "INVESTOR" ||
    value === "GOVERNMENT"
  );
}

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

  async findPublicById(
    userId: string,
  ): Promise<PublicProfileDTO | null> {
    const {
      data,
      error,
    } = await this.supabase
      .from("profiles")
      .select(PUBLIC_PROFILE_COLUMNS)
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      throw mapDatabaseError(
        error,
        "profiles.findPublicById",
      );
    }

    if (!data) {
      return null;
    }

    const modesByUserId =
      await this.findStakeholderModesByUserIds([
        userId,
      ]);

    return toPublicProfile(
      mapProfileRow(
        data as ProfileDatabaseRow,
      ),
      modesByUserId.get(userId) ?? [],
    );
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

    if (queryOptions.search) {
      const term =
        queryOptions.search.replaceAll(
          "%",
          "\\%",
        );

      query = query.or(
        `display_name.ilike.%${term}%,username.ilike.%${term}%`,
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

  async findPublicProfiles(
    filters: {
      search?: string;
      limit: number;
    },
  ): Promise<PublicProfileDTO[]> {
    let query = this.supabase
      .from("profiles")
      .select(PUBLIC_PROFILE_COLUMNS)
      .order("updated_at", {
        ascending: false,
      })
      .limit(filters.limit);

    if (filters.search) {
      const term =
        filters.search.replaceAll(
          "%",
          "\\%",
        );

      query = query.or(
        `display_name.ilike.%${term}%,username.ilike.%${term}%`,
      );
    }

    const {
      data,
      error,
    } = await query;

    if (error) {
      throw mapDatabaseError(
        error,
        "profiles.findPublicProfiles",
      );
    }

    const profileRows =
      (data ?? []).map((row) =>
        mapProfileRow(
          row as ProfileDatabaseRow,
        ),
      );

    const modesByUserId =
      await this.findStakeholderModesByUserIds(
        profileRows.map(
          (profile) => profile.id,
        ),
      );

    return profileRows.map((profile) =>
      toPublicProfile(
        profile,
        modesByUserId.get(profile.id) ?? [],
      ),
    );
  }

  private async findStakeholderModesByUserIds(
    userIds: string[],
  ): Promise<Map<string, PublicStakeholderMode[]>> {
    const modesByUserId =
      new Map<string, PublicStakeholderMode[]>();

    if (userIds.length === 0) {
      return modesByUserId;
    }

    const {
      data,
      error,
    } = await this.supabase
      .from("user_stakeholder_modes")
      .select("user_id, mode")
      .in("user_id", userIds);

    if (error) {
      throw mapDatabaseError(
        error,
        "profiles.findStakeholderModesByUserIds",
      );
    }

    for (const row of data ?? []) {
      const userId =
        String(row.user_id);
      const mode =
        row.mode;

      if (
        !isPublicStakeholderMode(mode)
      ) {
        continue;
      }

      const current =
        modesByUserId.get(userId) ?? [];

      if (!current.includes(mode)) {
        current.push(mode);
      }

      modesByUserId.set(
        userId,
        current,
      );
    }

    return modesByUserId;
  }
}
