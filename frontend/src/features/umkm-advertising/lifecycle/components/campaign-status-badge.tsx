"use client";

import React from "react";
import { CampaignLifecycleStatus } from "../types/lifecycle.types";
import { 
  FileText, 
  CheckCircle, 
  Clock, 
  PlayCircle, 
  PauseCircle, 
  CheckCheck, 
  XCircle 
} from "lucide-react";

interface CampaignStatusBadgeProps {
  status: CampaignLifecycleStatus;
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
  className?: string;
}

export function CampaignStatusBadge({
  status,
  size = "md",
  showIcon = true,
  className = "",
}: CampaignStatusBadgeProps) {
  const getStatusConfig = (s: CampaignLifecycleStatus) => {
    switch (s) {
      case "DRAFT":
        return {
          label: "Draft",
          icon: FileText,
          bg: "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
          dot: "bg-slate-400",
        };
      case "READY":
        return {
          label: "Siap Tayang",
          icon: CheckCircle,
          bg: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800",
          dot: "bg-blue-500",
        };
      case "SCHEDULED":
        return {
          label: "Terjadwal",
          icon: Clock,
          bg: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800",
          dot: "bg-purple-500",
        };
      case "ACTIVE":
        return {
          label: "Aktif Berjalan",
          icon: PlayCircle,
          bg: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800",
          dot: "bg-emerald-500 animate-pulse",
        };
      case "PAUSED":
        return {
          label: "Dijeda (Paused)",
          icon: PauseCircle,
          bg: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800",
          dot: "bg-amber-500",
        };
      case "ENDED":
        return {
          label: "Selesai (Ended)",
          icon: CheckCheck,
          bg: "bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800/80 dark:text-zinc-400 dark:border-zinc-700",
          dot: "bg-zinc-400",
        };
      case "CANCELLED":
        return {
          label: "Dibatalkan",
          icon: XCircle,
          bg: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800",
          dot: "bg-rose-500",
        };
      default:
        return {
          label: status,
          icon: FileText,
          bg: "bg-slate-100 text-slate-700 border-slate-300",
          dot: "bg-slate-400",
        };
    }
  };

  const config = getStatusConfig(status);
  const IconComponent = config.icon;

  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs gap-1.5",
    md: "px-2.5 py-1 text-xs font-medium gap-1.5",
    lg: "px-3 py-1.5 text-sm font-medium gap-2",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border shadow-sm ${config.bg} ${sizeClasses[size]} ${className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
      {showIcon && <IconComponent className="h-3.5 w-3.5 flex-shrink-0" />}
      <span>{config.label}</span>
    </span>
  );
}
