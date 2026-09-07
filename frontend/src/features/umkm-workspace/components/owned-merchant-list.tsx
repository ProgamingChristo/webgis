"use client";

import { merchantPublishLabel } from "../model/umkm-workspace-state";
import type { OwnedMerchantBrief } from "../types/umkm-workspace.types";

export function OwnedMerchantList({ merchants, selectedMerchantId, onSelect }: {
  merchants: OwnedMerchantBrief[]; selectedMerchantId?: string; onSelect?: (id: string) => void;
}) {
  return <div className="divide-y divide-slate-800 rounded-xl border border-slate-700 bg-slate-900/50">
    {merchants.map((merchant) => <article key={merchant.id} className="flex min-w-0 flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <h3 className="break-words text-base font-semibold text-white">{merchant.name}</h3>
        <p className="mt-1 text-sm text-slate-400">{merchant.category}</p>
        <p className="mt-1 break-words text-xs leading-5 text-slate-400">{merchant.address ?? "Alamat belum tersedia"}</p>
        <p className="mt-2 text-xs text-slate-300">{merchantPublishLabel(merchant.publish_status)} · {merchant.verification_status === "VERIFIED" ? "Terverifikasi" : "Verifikasi perlu diperiksa"}</p>
      </div>
      {onSelect ? <button type="button" onClick={() => onSelect(merchant.id)} className="min-h-10 shrink-0 rounded-lg border border-slate-600 px-4 py-2 text-sm text-emerald-300 hover:bg-slate-800">{selectedMerchantId === merchant.id ? "Lihat ringkasan usaha" : "Kelola usaha ini"}</button> : null}
    </article>)}
  </div>;
}
