import type {
  RepositoryPagination,
  RepositorySort,
} from "@/src/types/entity";

export type AccountRole =
  | "USER"
  | "ADMIN";

export interface ProfileDatabaseRow {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  account_role: AccountRole;
  trust_score: number;
  onboarding_complete: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProfileDTO {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  account_role: AccountRole;
  trust_score: number;
  onboarding_complete: boolean;
  created_at: string;
  updated_at: string;
}

export type Profile = ProfileDTO;

export type ProfileUpdateData = Partial<
  Pick<
    ProfileDTO,
    "display_name" | "avatar_url"
  >
>;

export type ProfileFilters = {
  account_role?: AccountRole;
};

export type ProfileSortField =
  | "created_at"
  | "updated_at"
  | "display_name";

export type ProfileListQuery =
  ProfileFilters &
  RepositoryPagination &
  RepositorySort<ProfileSortField>;