import React, { useState } from "react";
import { useCreateCampaign } from "../../hooks/use-create-campaign";

export function CampaignCreateForm({ merchantId, onSuccess }: { merchantId: string; onSuccess: () => void }) {
  const [name, setName] = useState("");
  const { create, loading, error } = useCreateCampaign(onSuccess);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await create({ merchantId, name });
  };

  return (
    <form id="buat-promosi" onSubmit={handleSubmit} className="scroll-mt-6 space-y-4 rounded-2xl border border-slate-200 bg-slate-50/60 p-6">
      <h3 className="text-base font-bold text-slate-900">Buat Draf Promosi</h3>
      <p className="text-xs leading-5 text-slate-600">Mulai dengan nama promosi. Selanjutnya, lengkapi materi, sasaran, dan jadwal sebelum mengaktifkannya.</p>
      {error && <p className="text-xs font-semibold text-red-600">{error}</p>}
      <div className="flex flex-col space-y-2">
        <label htmlFor="name" className="text-xs font-bold uppercase tracking-wider text-slate-700">Nama promosi</label>
        <input 
          id="name"
          type="text" 
          placeholder="Promo Paket Mahasiswa" 
          value={name} 
          onChange={(e) => setName(e.target.value)}
          className="min-h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-hidden placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 transition"
          required
        />
      </div>
      <button 
        type="submit" 
        disabled={loading || !name.trim()}
        style={{ color: loading || !name.trim() ? "#64748b" : "#ffffff" }}
        className="min-h-10 rounded-xl bg-sky-600 px-5 text-xs font-bold text-white shadow-xs transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "Menyimpan..." : "Simpan draf"}
      </button>
    </form>
  );
}
