export type ProfileRole = "COMMUTER" | "UMKM" | "COMMUNITY" | "ADMIN";

export interface ProfileDatabaseRow {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  role: ProfileRole;
  created_at: string;
  updated_at: string;
}

export interface ProfileDTO {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  role: ProfileRole;
  created_at: string;
  updated_at: string;
}

export type Profile = ProfileDTO;

export type ProfileUpdateData = Partial<
  Pick<ProfileDTO, "display_name" | "avatar_url">
>;

export type ProfileFilters = {
  role?: ProfileRole;
};

export type ProfileSortField = "created_at" | "updated_at" | "display_name";

export type ProfileListQuery = ProfileFilters &
  RepositoryPagination &
  RepositorySort<ProfileSortField>;
import type {
  RepositoryPagination,
  RepositorySort,
} from "@/src/types/entity";
