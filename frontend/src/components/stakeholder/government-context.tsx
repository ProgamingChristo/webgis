"use client";

import React from "react";
import {
  Building2,
} from "lucide-react";

interface GovernmentContextProps {
  children: React.ReactNode;
}

export function GovernmentContext({
  children,
}: GovernmentContextProps) {
  return (
    <div
      className="experience-context experience-context--government"
      data-testid="government-context"
    >
      <div className="stakeholder-notice stakeholder-notice--government">
        <Building2 size={16} />
        <span>
          <strong>Mode Pemerintah:</strong> fokus pada cakupan layanan kota,
          batas wilayah, akses publik, dan agregasi spasial.
        </span>
      </div>
      {children}
    </div>
  );
}
