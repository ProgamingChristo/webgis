import type {
  ProfileDatabaseRow,
  ProfileDTO,
} from "@/src/types/profile";

export function mapProfileRow(
  row: ProfileDatabaseRow,
): ProfileDTO {
  return {
    id: row.id,
    display_name: row.display_name,
    username: row.username,
    avatar_url: row.avatar_url,
    phone_number: row.phone_number,
    bio: row.bio,
    account_role: row.account_role,
    trust_score: row.trust_score,
    onboarding_complete:
      row.onboarding_complete,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}
