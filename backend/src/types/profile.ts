import type {
  RepositoryPagination,
  RepositorySort,
} from "@/src/types/entity";

export type AccountRole =
  | "USER"
  | "ADMIN";

export type PublicStakeholderMode =
  | "UMKM"
  | "INVESTOR"
  | "GOVERNMENT";

export interface ProfileDatabaseRow {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  phone_number: string | null;
  bio: string | null;
  account_role: AccountRole;
  trust_score: number;
  onboarding_complete: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProfileDTO {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  phone_number: string | null;
  bio: string | null;
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
    "display_name" | "username" | "avatar_url" | "phone_number" | "bio"
  >
>;

export type PublicProfileDTO = Pick<
  ProfileDTO,
  | "id"
  | "display_name"
  | "username"
  | "avatar_url"
  | "bio"
  | "account_role"
  | "trust_score"
  | "created_at"
> & {
  stakeholder_modes: PublicStakeholderMode[];
};

export type ProfileFilters = {
  account_role?: AccountRole;
  search?: string;
};

export type ProfileSortField =
  | "created_at"
  | "updated_at"
  | "display_name";

export type ProfileListQuery =
  ProfileFilters &
  RepositoryPagination &
  RepositorySort<ProfileSortField>;
