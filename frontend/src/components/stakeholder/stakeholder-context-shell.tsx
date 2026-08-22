"use client";

import React from "react";
import { useStakeholder } from "@/src/components/providers/StakeholderProvider";
import { GeneralContext } from "./general-context";
import { UMKMContext } from "./umkm-context";
import { InvestorContext } from "./investor-context";
import { GovernmentContext } from "./government-context";

interface StakeholderContextShellProps {
  children: React.ReactNode;
}

/**
 * A layout shell that delegates rendering to the specific active Experience module.
 */
export function StakeholderContextShell({ children }: StakeholderContextShellProps) {
  const { activeExperience } = useStakeholder();

  switch (activeExperience) {
    case "UMKM":
      return <UMKMContext>{children}</UMKMContext>;
    case "INVESTOR":
      return <InvestorContext>{children}</InvestorContext>;
    case "GOVERNMENT":
      return <GovernmentContext>{children}</GovernmentContext>;
    case "GENERAL":
    default:
      return <GeneralContext>{children}</GeneralContext>;
  }
}
