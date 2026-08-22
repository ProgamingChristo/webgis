"use client";

import React from "react";
import { Info } from "lucide-react";

interface UMKMContextProps {
  children: React.ReactNode;
}

/**
 * The UMKM Stakeholder Experience.
 * Provides localized UMKM tools over the general data layer.
 * Rule: DOES NOT automatically claim merchant ownership.
 */
export function UMKMContext({ children }: UMKMContextProps) {
  return (
    <div className="experience-context experience-context--umkm" data-testid="umkm-context">
      <div className="stakeholder-notice" style={{ padding: '0.5rem', marginBottom: '1rem', backgroundColor: '#eef2ff', borderRadius: '4px', border: '1px solid #c7d2fe', display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '0.85rem' }}>
        <Info size={16} color="#4f46e5" />
        <span>
          <strong>Mode UMKM:</strong> Jelajahi potensi pasar dan optimasi logistik di sekitar area target.
        </span>
      </div>
      
      {/* 
        This keeps the existing Map and Data active, just under the UMKM context.
      */}
      {children}
    </div>
  );
}
