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
          <strong>Mode General / Commuter:</strong> akses default untuk peta,
          pencarian, rute, community, dan eksplorasi area. Mode ini tidak
          disimpan sebagai stakeholder database.
        </span>
      </div>
      {children}
    </div>
  );
}
