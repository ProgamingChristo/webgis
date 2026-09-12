"use client";

import React from "react";
import Link from "next/link";
import {
  Megaphone,
  Store,
} from "lucide-react";

interface UMKMContextProps {
  children: React.ReactNode;
  hideNotice?: boolean;
}

export function UMKMContext({
  children,
  hideNotice = false,
}: UMKMContextProps) {
  return (
    <div
      className="experience-context experience-context--umkm"
      data-testid="umkm-context"
    >
      {!hideNotice ? <div className="stakeholder-notice stakeholder-notice--umkm">
        <Store size={16} />
        <span>
          <strong>Pengalaman UMKM:</strong> lihat kebutuhan area, kelola usaha,
          pahami rute pelanggan, dan siapkan promosi.
        </span>
        <Link
          className="stakeholder-notice__action"
          href="/umkm/advertising"
        >
          <Megaphone size={13} />
          Kelola Promosi
        </Link>
      </div> : null}
      {children}
    </div>
  );
}
