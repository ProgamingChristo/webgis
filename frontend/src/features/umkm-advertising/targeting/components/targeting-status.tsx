"use client";

import React from "react";
import { TargetingReadiness } from "../types/targeting.types";

export function TargetingStatus({ status }: { status: TargetingReadiness }) {
  if (status === "CONFIGURED") {
    return (
      <span className="inline-flex shrink-0 items-center whitespace-nowrap px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5" />
        Siap
      </span>
    );
  }

  if (status === "INVALID") {
    return (
      <span className="inline-flex shrink-0 items-center whitespace-nowrap px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-200">
        <span className="w-1.5 h-1.5 rounded-full bg-red-500 mr-1.5" />
        Tidak Valid
      </span>
    );
  }

  return (
    <span className="inline-flex shrink-0 items-center whitespace-nowrap px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5" />
      Belum Diatur
    </span>
  );
}
