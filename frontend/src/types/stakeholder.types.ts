/**
 * StakeholderMode represents the actual data-level modes an authenticated user belongs to.
 * This should perfectly align with the backend 'profiles.stakeholder_modes' array.
 */
export type StakeholderMode = "UMKM" | "INVESTOR" | "GOVERNMENT";

/**
 * ExperienceMode represents the CURRENT active UI context.
 * "GENERAL" is always available and acts as the universal baseline.
 */
export type ExperienceMode = "GENERAL" | StakeholderMode;
