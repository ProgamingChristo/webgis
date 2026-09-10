"use client";

import React from "react";
import {
  TrendingUp,
} from "lucide-react";

interface InvestorContextProps {
  children: React.ReactNode;
}

export function InvestorContext({
  children,
}: InvestorContextProps) {
  return (
    <div
      className="experience-context experience-context--investor"
      data-testid="investor-context"
    >
      <div className="stakeholder-notice stakeholder-notice--investor">
        <TrendingUp size={16} />
        <span>
          <strong>Pengalaman investor:</strong> bandingkan peluang area,
          kondisi lokasi, kepadatan tempat, dan akses pasar.
        </span>
      </div>
      {children}
    </div>
  );
}
