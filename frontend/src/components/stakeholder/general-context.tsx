"use client";

import React from "react";
import {
  Compass,
} from "lucide-react";

interface GeneralContextProps {
  children: React.ReactNode;
}

export function GeneralContext({
  children,
}: GeneralContextProps) {
  return (
    <div
      className="experience-context experience-context--general"
      data-testid="general-context"
    >
      <div className="stakeholder-notice stakeholder-notice--general">
        <Compass size={16} />
        <span>
          <strong>Pengalaman umum:</strong> gunakan peta, pencarian, rute,
          komunitas, dan eksplorasi area.
        </span>
      </div>
      {children}
    </div>
  );
}
