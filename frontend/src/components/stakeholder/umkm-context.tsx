"use client";

import React from "react";
import Link from "next/link";
import {
  Megaphone,
  Store,
} from "lucide-react";

interface UMKMContextProps {
  children: React.ReactNode;
}

export function UMKMContext({
  children,
}: UMKMContextProps) {
  return (
    <div
      className="experience-context experience-context--umkm"
      data-testid="umkm-context"
    >
      <div className="stakeholder-notice stakeholder-notice--umkm">
        <Store size={16} />
        <span>
          <strong>Mode UMKM:</strong> fokus pada potensi pasar, merchant,
          rute pelanggan, dan promosi usaha lokal.
        </span>
        <Link
          className="stakeholder-notice__action"
          href="/umkm/advertising"
        >
          <Megaphone size={13} />
          Advertising Manager →
        </Link>
      </div>
      {children}
    </div>
  );
}
