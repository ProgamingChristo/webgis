"use client";

import React, { createContext, useContext, useState, useEffect, useMemo } from "react";
import { useAuth } from "./AuthProvider";
import { StakeholderMode, ExperienceMode } from "@/src/types/stakeholder.types";

const ALL_STAKEHOLDER_MODES: StakeholderMode[] = [
  "UMKM",
  "INVESTOR",
  "GOVERNMENT",
];
const EXPERIENCE_STORAGE_PREFIX = "getra:active-experience";

interface StakeholderContextValue {
  activeExperience: ExperienceMode;
  setActiveExperience: (mode: ExperienceMode) => void;
  availableExperiences: ExperienceMode[];
  experienceReady: boolean;
}

const StakeholderContext = createContext<StakeholderContextValue>({
  activeExperience: "GENERAL",
  setActiveExperience: () => {},
  availableExperiences: ["GENERAL"],
  experienceReady: false,
});

export const useStakeholder = () => useContext(StakeholderContext);

export function StakeholderProvider({ children }: { children: React.ReactNode }) {
  const { context: authContext, loading } = useAuth();
  const [activeExperience, setActiveExperience] = useState<ExperienceMode>("GENERAL");
  const [experienceReady, setExperienceReady] = useState(false);

  // Determine available experiences based on the user's stakeholder modes.
  // We useMemo to prevent unnecessary array recreation which trips the useEffect below
  const availableExperiences: ExperienceMode[] = useMemo(() => {
    if (authContext?.profile?.account_role === "ADMIN") {
      return ["GENERAL", ...ALL_STAKEHOLDER_MODES];
    }

    const userModes = authContext?.stakeholder_modes || [];
    const validModes = userModes.filter(m => 
      m === "UMKM" || m === "INVESTOR" || m === "GOVERNMENT"
    ) as StakeholderMode[];
    return ["GENERAL", ...validModes];
  }, [authContext?.profile?.account_role, authContext?.stakeholder_modes]);

  const storageKey = authContext?.user.id
    ? `${EXPERIENCE_STORAGE_PREFIX}:${authContext.user.id}`
    : null;

  // Restore the last UI context per account. This does not alter account_role
  // or stakeholder_modes; those remain authoritative backend permissions.
  useEffect(() => {
    if (loading || !storageKey) return;

    const storedMode = window.localStorage.getItem(storageKey) as ExperienceMode | null;
    const restoredMode = storedMode && availableExperiences.includes(storedMode)
      ? storedMode
      : "GENERAL";

    const timeoutId = window.setTimeout(() => {
      setActiveExperience(restoredMode);
      setExperienceReady(true);
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [availableExperiences, loading, storageKey]);

  // Safety fallback: if somehow the active experience is no longer in the available list, reset to GENERAL.
  useEffect(() => {
    if (!loading && !availableExperiences.includes(activeExperience)) {
      setTimeout(() => setActiveExperience("GENERAL"), 0);
    }
  }, [availableExperiences, activeExperience, loading]);

  const handleSetExperience = (mode: ExperienceMode) => {
    if (availableExperiences.includes(mode)) {
      setActiveExperience(mode);
      setExperienceReady(true);
      if (storageKey) {
        window.localStorage.setItem(storageKey, mode);
      }
    } else {
      console.warn(`Attempted to set unauthorized or invalid ExperienceMode: ${mode}`);
    }
  };

  return (
    <StakeholderContext.Provider
      value={{
        activeExperience,
        setActiveExperience: handleSetExperience,
        availableExperiences,
        experienceReady,
      }}
    >
      {children}
    </StakeholderContext.Provider>
  );
}
