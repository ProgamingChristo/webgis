"use client";

import { useRouter } from "next/navigation";
import { useStakeholder } from "@/src/components/providers/StakeholderProvider";
import { ExperienceMode } from "@/src/types/stakeholder.types";

/**
 * A highly accessible switcher component for selecting the active UI Experience.
 * It reads directly from StakeholderProvider so it knows exactly what is allowed.
 */
export function StakeholderModeSwitcher() {
  const { activeExperience, availableExperiences, setActiveExperience } = useStakeholder();
  const router = useRouter();

  const handleSelect = (mode: ExperienceMode) => {
    setActiveExperience(mode);
    router.push("/app");
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
      aria-label="Pilih pengalaman aktif GETRA"
      role="tablist"
    >
      {availableExperiences.map((mode) => {
        const isActive = activeExperience === mode;
        return (
          <button
            key={mode}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={`stakeholder-button ${isActive ? "stakeholder-button--active" : ""}`}
            onClick={() => handleSelect(mode)}
          >
            {labels[mode]}
          </button>
        );
      })}
    </nav>
  );
}
