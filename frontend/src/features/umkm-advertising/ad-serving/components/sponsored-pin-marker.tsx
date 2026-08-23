"use client";

import React from "react";
import { Megaphone, Sparkles } from "lucide-react";

interface SponsoredPinMarkerProps {
  headline?: string;
  merchantName?: string;
  onClick?: () => void;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function SponsoredPinMarker({
  headline,
  merchantName,
  onClick,
  className = "",
  size = "md",
}: SponsoredPinMarkerProps) {
  const sizeMap = {
    sm: "w-8 h-8",
    md: "w-10 h-10",
    lg: "w-12 h-12",
  };

  const iconSizeMap = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6",
  };

  return (
    <div
      onClick={onClick}
      title={[headline, merchantName].filter(Boolean).join(" · ") || "Sponsored pin"}
      className={`group relative flex flex-col items-center cursor-pointer select-none transition-transform duration-200 hover:scale-110 active:scale-95 ${className}`}
    >
      {/* Sponsored Pill Tag */}
      <span className="mb-1 inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-500/90 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-white shadow-md backdrop-blur-sm dark:border-amber-400 dark:bg-amber-600">
        <Sparkles className="w-2.5 h-2.5" />
        Sponsored
      </span>

      {/* Pin Body with Glow */}
      <div className="relative">
        <div className="absolute -inset-1 rounded-full bg-amber-400 opacity-60 blur-sm group-hover:opacity-100 transition-opacity animate-pulse" />
        <div
          className={`relative flex items-center justify-center rounded-full border-2 border-white bg-gradient-to-tr from-amber-600 via-amber-500 to-yellow-400 text-white shadow-lg ${sizeMap[size]}`}
        >
          <Megaphone className={`${iconSizeMap[size]} text-white drop-shadow-sm`} />
        </div>
      </div>

      {/* Pin Pointer Arrow */}
      <div className="-mt-1 h-2 w-2 rotate-45 border-r border-b border-amber-600 bg-amber-600 shadow-sm" />
    </div>
  );
}
