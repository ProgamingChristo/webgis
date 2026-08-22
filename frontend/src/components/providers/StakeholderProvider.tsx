"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
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
  // We explicitly extract it safely.
  const userModes: StakeholderMode[] = authContext?.stakeholder_modes || [];
  
  // Cast safety since API contract validates it, but we can also filter to be extremely defensive
  const validModes: StakeholderMode[] = userModes.filter(m => 
    ["UMKM", "INVESTOR", "GOVERNMENT"].includes(m)
  ) as StakeholderMode[];
  
  const availableExperiences: ExperienceMode[] = ["GENERAL", ...validModes];

  // Effect: Ensure active experience is always valid. If the user loses a mode, fallback to GENERAL.
  useEffect(() => {
    if (!loading && !availableExperiences.includes(activeExperience)) {
      setActiveExperience("GENERAL");
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
