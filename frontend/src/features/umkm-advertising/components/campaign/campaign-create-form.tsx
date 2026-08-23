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
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-slate-700 bg-slate-900/55 p-5">
      <h3 className="text-lg font-bold text-slate-100">Buat campaign draft</h3>
      {error && <p className="text-sm text-red-300">{error}</p>}
      <div className="flex flex-col space-y-2">
        <label htmlFor="name" className="text-sm font-bold text-slate-300">Nama campaign</label>
        <input 
          id="name"
          type="text" 
          placeholder="Promo Paket Mahasiswa" 
          value={name} 
          onChange={(e) => setName(e.target.value)}
          className="min-h-11 rounded-xl border border-slate-700 bg-slate-950/70 px-4 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/15"
          required
        />
      </div>
      <button 
        type="submit" 
        disabled={loading || !name.trim()}
        className="min-h-10 rounded-xl bg-gradient-to-r from-lime-400 to-cyan-400 px-5 text-sm font-black text-slate-950 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {loading ? "Menyimpan..." : "Simpan Draft"}
      </button>
    </form>
  );
}
