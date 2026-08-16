import type {
  ProfileDatabaseRow,
  ProfileDTO,
} from "@/src/types/profile";

export function mapProfileRow(row: ProfileDatabaseRow): ProfileDTO {
  return {
    avatar_url: row.avatar_url,
    created_at: row.created_at,
    display_name: row.display_name,
    id: row.id,
    role: row.role,
    updated_at: row.updated_at,
  };
}
