"use client";

import React, { createContext, useContext, useState, useEffect, useMemo } from "react";
import { useAuth } from "./AuthProvider";
import { StakeholderMode, ExperienceMode } from "@/src/types/stakeholder.types";

interface StakeholderContextValue {
  activeExperience: ExperienceMode;
  setActiveExperience: (mode: ExperienceMode) => void;
  availableExperiences: ExperienceMode[];
}

const StakeholderContext = createContext<StakeholderContextValue>({
  activeExperience: "GENERAL",
  setActiveExperience: () => {},
  availableExperiences: ["GENERAL"],
});

export const useStakeholder = () => useContext(StakeholderContext);

export function StakeholderProvider({ children }: { children: React.ReactNode }) {
  const { context: authContext, loading } = useAuth();
  const [activeExperience, setActiveExperience] = useState<ExperienceMode>("GENERAL");

  // Determine available experiences based on the user's stakeholder modes.
  // We useMemo to prevent unnecessary array recreation which trips the useEffect below
  const availableExperiences: ExperienceMode[] = useMemo(() => {
    const userModes = authContext?.stakeholder_modes || [];
    const validModes = userModes.filter(m => 
      m === "UMKM" || m === "INVESTOR" || m === "GOVERNMENT"
    ) as StakeholderMode[];
    return ["GENERAL", ...validModes];
  }, [authContext?.stakeholder_modes]);

  // Safety fallback: if somehow the active experience is no longer in the available list, reset to GENERAL.
  useEffect(() => {
    if (!loading && !availableExperiences.includes(activeExperience)) {
      setTimeout(() => setActiveExperience("GENERAL"), 0);
    }
  }, [availableExperiences, activeExperience, loading]);

  const handleSetExperience = (mode: ExperienceMode) => {
    if (availableExperiences.includes(mode)) {
      setActiveExperience(mode);
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
      }}
    >
      {children}
    </StakeholderContext.Provider>
  );
}
