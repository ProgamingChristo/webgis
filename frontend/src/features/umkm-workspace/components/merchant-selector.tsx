"use client";

import type { OwnedMerchantBrief } from "../types/umkm-workspace.types";

export function MerchantSelector({ merchants, selectedMerchantId, onSelect }: {
  merchants: OwnedMerchantBrief[]; selectedMerchantId: string; onSelect: (id: string) => void;
}) {
  if (merchants.length < 2) return null;
  return <label className="block w-full text-xs font-semibold text-slate-700 sm:max-w-sm">
    Usaha yang sedang dikelola
    <select value={selectedMerchantId} onChange={(event) => onSelect(event.target.value)} className="mt-1.5 block w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none">
      {merchants.map((merchant) => <option key={merchant.id} value={merchant.id}>{merchant.name}</option>)}
    </select>
  </label>;
}
