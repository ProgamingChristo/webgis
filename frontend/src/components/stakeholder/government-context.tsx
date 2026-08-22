"use client";

import React from "react";
import { Building2 } from "lucide-react";

interface GovernmentContextProps {
  children: React.ReactNode;
}

/**
 * The Government Stakeholder Experience.
 * Provides policy and urban mobility context.
 * Rule: NO FAKE METRICS.
 */
export function GovernmentContext({ children }: GovernmentContextProps) {
  return (
    <div className="experience-context experience-context--government" data-testid="government-context">
      <div className="stakeholder-notice" style={{ padding: '0.5rem', marginBottom: '1rem', backgroundColor: '#f0fdfa', borderRadius: '4px', border: '1px solid #ccfbf1', display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '0.85rem' }}>
        <Building2 size={16} color="#0d9488" />
        <span>
          <strong>Mode Pemerintah:</strong> Data agregat mobilitas dan rekomendasi kebijakan untuk area ini sedang disiapkan.
        </span>
      </div>
      
      {/* 
        This keeps the existing Map and Data active, just under the Government context.
      */}
      {children}
    </div>
  );
}
