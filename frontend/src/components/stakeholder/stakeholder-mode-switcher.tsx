"use client";

import React from "react";
import { usePathname, useRouter } from "next/navigation";
import { useStakeholder } from "@/src/components/providers/StakeholderProvider";
import { ExperienceMode } from "@/src/types/stakeholder.types";

/**
 * A highly accessible switcher component for selecting the active UI Experience.
 * It reads directly from StakeholderProvider so it knows exactly what is allowed.
 */
export function StakeholderModeSwitcher() {
  const { activeExperience, availableExperiences, setActiveExperience } = useStakeholder();
  const pathname = usePathname();
  const router = useRouter();
  const isCommunityActive = pathname.startsWith("/community");

  const handleSelect = (mode: ExperienceMode) => {
    setActiveExperience(mode);
    if (pathname.startsWith("/community")) {
      router.push("/");
    }
  };

  const handleCommunitySelect = () => {
    router.push("/community");
  };

  const labels: Record<ExperienceMode, string> = {
    GENERAL: "General",
    UMKM: "UMKM",
    INVESTOR: "Investor",
    GOVERNMENT: "Pemerintah", // Using actual localized term from constraints
  };

  return (
    <nav
      className="stakeholder-switch"
      aria-label="Mode data"
      role="tablist"
    >
      {availableExperiences.map((mode) => {
        const isActive = !isCommunityActive && activeExperience === mode;
        return (
          <React.Fragment key={mode}>
          <button
            type="button"
            role="tab"
            aria-selected={isActive}
            className={`stakeholder-button ${isActive ? "stakeholder-button--active" : ""}`}
            onClick={() => handleSelect(mode)}
          >
            {labels[mode]}
          </button>
          {mode === "GENERAL" ? (
            <button
              type="button"
              role="tab"
              aria-selected={isCommunityActive}
              className={`stakeholder-button ${isCommunityActive ? "stakeholder-button--active" : ""}`}
              onClick={handleCommunitySelect}
            >
              Community
            </button>
          ) : null}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
