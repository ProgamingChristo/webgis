"use client";

import type { OwnedMerchantBrief } from "../types/umkm-workspace.types";

export function MerchantSelector({ merchants, selectedMerchantId, onSelect }: {
  merchants: OwnedMerchantBrief[]; selectedMerchantId: string; onSelect: (id: string) => void;
}) {
  if (merchants.length < 2) return null;
  return <label className="block w-full text-xs font-medium text-slate-300 sm:max-w-sm">
    Usaha yang sedang dikelola
    <select value={selectedMerchantId} onChange={(event) => onSelect(event.target.value)} className="mt-2 block w-full min-w-0 rounded-xl border border-slate-600 bg-slate-950 px-3 py-3 text-sm text-white focus:border-emerald-400">
      {merchants.map((merchant) => <option key={merchant.id} value={merchant.id}>{merchant.name}</option>)}
    </select>
  </label>;
}
