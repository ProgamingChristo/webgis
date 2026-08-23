import type {
  PublicProfile,
  UserContext,
} from "@/src/lib/auth-client";

type StakeholderMode =
  "UMKM" |
  "INVESTOR" |
  "GOVERNMENT";

export interface ExperienceBadge {
  label: string;
  tone:
    | "general"
    | "umkm"
    | "investor"
    | "government"
    | "admin";
}

const STAKEHOLDER_BADGES:
Record<StakeholderMode, ExperienceBadge> = {
  UMKM: {
    label: "UMKM",
    tone: "umkm",
  },
  INVESTOR: {
    label: "Investor",
    tone: "investor",
  },
  GOVERNMENT: {
    label: "Pemerintah",
    tone: "government",
  },
};

export function getExperienceBadges(
  input:
    | UserContext
    | PublicProfile
    | null
    | undefined,
): ExperienceBadge[] {
  const profile =
    input && "profile" in input
      ? input.profile
      : input;

  const modes =
    input && "stakeholder_modes" in input
      ? input.stakeholder_modes
      : [];

  const badges: ExperienceBadge[] = [
    {
      label: "General / Commuter",
      tone: "general",
    },
  ];

  for (const mode of modes ?? []) {
    badges.push(
      STAKEHOLDER_BADGES[mode],
    );
  }

  if (profile?.account_role === "ADMIN") {
    badges.push({
      label: "Admin",
      tone: "admin",
    });
  }

  return badges;
}

export function getPrimaryExperienceLabel(
  input:
    | UserContext
    | PublicProfile
    | null
    | undefined,
) {
  const badges =
    getExperienceBadges(input).filter(
      (badge) => badge.tone !== "admin",
    );

  if (badges.length <= 1) {
    return "General / Commuter";
  }

  return badges
    .slice(1)
    .map((badge) => badge.label)
    .join(" + ");
}
