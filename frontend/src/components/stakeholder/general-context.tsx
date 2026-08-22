"use client";

import React from "react";

interface GeneralContextProps {
  children: React.ReactNode;
}

/**
 * The baseline GETRA product experience.
 * This should transparently pass through the children (Map, Main Dashboard components)
 * so that users get the unmodified original data exploration capabilities.
 */
export function GeneralContext({ children }: GeneralContextProps) {
  return (
    <div className="experience-context experience-context--general" data-testid="general-context">
      {/* 
        In Phase 9, this simply wraps the children.
        We do not hide any data layer here. Community, Transit, UMKM are fully explorable.
      */}
      {children}
    </div>
  );
}
