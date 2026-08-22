"use client";

import React from "react";
import { TrendingUp } from "lucide-react";

interface InvestorContextProps {
  children: React.ReactNode;
}

/**
 * The Investor Stakeholder Experience.
 * Provides data-driven insights context.
 * Rule: NO FAKE METRICS. If AI/Investment data is not available, state honestly.
 */
export function InvestorContext({ children }: InvestorContextProps) {
  return (
    <div className="experience-context experience-context--investor" data-testid="investor-context">
      <div className="stakeholder-notice" style={{ padding: '0.5rem', marginBottom: '1rem', backgroundColor: '#fdf4ff', borderRadius: '4px', border: '1px solid #fbcfe8', display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '0.85rem' }}>
        <TrendingUp size={16} color="#d946ef" />
        <span>
          <strong>Mode Investor:</strong> Data analisis kelayakan investasi spasial belum tersedia untuk area ini.
        </span>
      </div>
      
      {/* 
        This keeps the existing Map and Data active, just under the Investor context.
      */}
      {children}
    </div>
  );
}
