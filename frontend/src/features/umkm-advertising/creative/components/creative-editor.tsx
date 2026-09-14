"use client";
import React, { useState } from "react";
import { CreativeDTO, CtaType, CreativeType } from "../types/creative.types";
import { CreateCreativeInput, UpdateCreativeInput } from "../schemas/creative.schema";

interface CreativeEditorProps {
  creative: CreativeDTO | null;
  onSaveDraft: (data: CreateCreativeInput | UpdateCreativeInput) => Promise<void>;
  onMarkReady: (creativeId: string) => Promise<void>;
  onUploadImage: (creativeId: string, file: File) => Promise<void>;
  loading: boolean;
}

export function CreativeEditor({ creative, onSaveDraft, onMarkReady, onUploadImage, loading }: CreativeEditorProps) {
  const [headline, setHeadline] = useState(creative?.headline || "");
  const [description, setDescription] = useState(creative?.description || "");
  const [ctaType, setCtaType] = useState<CtaType>(creative?.ctaType || "VIEW_PROFILE");
  const [creativeType, setCreativeType] = useState<CreativeType>(creative?.creativeType || "SPONSORED_PIN");
  const [actionState, setActionState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const handleSave = async () => {
    setActionState("saving");
    setActionMessage("Menyimpan materi…");
    try {
      if (creative) {
        await onSaveDraft({ headline, description, cta_type: ctaType });
      } else {
        await onSaveDraft({ creative_type: creativeType, headline, description, cta_type: ctaType });
      }
      setActionState("saved");
      setActionMessage("Materi berhasil disimpan.");
    } catch {
      setActionState("error");
      setActionMessage("Materi belum dapat disimpan. Coba lagi.");
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && creative) {
      setActionState("saving");
      setActionMessage("Mengunggah gambar…");
      try {
        await onUploadImage(creative.id, e.target.files[0]);
        setActionState("saved");
        setActionMessage("Gambar berhasil diunggah.");
      } catch {
        setActionState("error");
        setActionMessage("Gambar belum dapat diunggah. Coba lagi.");
      }
    }
  };

  const handleMarkReady = async () => {
    if (!creative) return;
    setActionState("saving");
    setActionMessage("Memeriksa kesiapan materi…");
    try {
      await onMarkReady(creative.id);
      setActionState("saved");
      setActionMessage("Materi ditandai siap.");
    } catch {
      setActionState("error");
      setActionMessage("Materi belum dapat ditandai siap. Coba lagi.");
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white border border-gray-200 rounded p-4 shadow-sm">
        <h3 className="font-semibold text-lg mb-4">Materi promosi</h3>
        
        {!creative && (
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Jenis materi</label>
            <select 
              value={creativeType} 
              onChange={e => { setCreativeType(e.target.value as CreativeType); setActionState("idle"); }}
              className="min-h-11 w-full rounded-xl border border-slate-300 bg-white p-2 text-sm outline-hidden focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
              disabled={loading || actionState === "saving"}
            >
              <option value="SPONSORED_PIN">Penanda promosi</option>
              <option value="CONTEXTUAL_BANNER">Banner sesuai lokasi</option>
              <option value="PROFILE_POSTER">Poster profil</option>
            </select>
          </div>
        )}

        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Judul</label>
          <input 
            type="text" 
            value={headline}
            onChange={e => { setHeadline(e.target.value); setActionState("idle"); }}
            className="min-h-11 w-full rounded-xl border border-slate-300 bg-white p-2 text-sm outline-hidden focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
            placeholder="Misal: Paket Mahasiswa Rp18.000"
            maxLength={50}
            disabled={loading || creative?.status === "READY"}
          />
          <div className="text-right text-xs text-gray-400 mt-1">{headline.length}/50</div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Deskripsi (opsional)</label>
          <textarea 
            value={description}
            onChange={e => { setDescription(e.target.value); setActionState("idle"); }}
            className="w-full rounded-xl border border-slate-300 bg-white p-2 text-sm outline-hidden focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
            placeholder="Nasi + Lauk + Minum"
            maxLength={100}
            rows={3}
            disabled={loading || creative?.status === "READY"}
          />
          <div className="text-right text-xs text-gray-400 mt-1">{description.length}/100</div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Tombol tindakan</label>
          <select 
            value={ctaType} 
            onChange={e => { setCtaType(e.target.value as CtaType); setActionState("idle"); }}
            className="min-h-11 w-full rounded-xl border border-slate-300 bg-white p-2 text-sm outline-hidden focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
            disabled={loading || creative?.status === "READY"}
          >
            <option value="VIEW_PROFILE">Lihat Profil</option>
            <option value="REQUEST_ROUTE">Minta Rute</option>
          </select>
        </div>

        {creative && creative.status === "DRAFT" && (
          <div className="mb-4 pt-4 border-t border-gray-100">
            <label className="block text-sm font-medium mb-1">Gambar (opsional)</label>
            <input 
              type="file" 
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              disabled={loading}
              className="text-sm"
            />
            <div className="text-xs text-gray-500 mt-1">Format: JPG, PNG, WEBP. Maks: 5MB.</div>
          </div>
        )}

        {actionMessage && <p role={actionState === "error" ? "alert" : "status"} className={`mb-3 rounded-xl border p-3 text-xs font-medium ${actionState === "error" ? "border-red-200 bg-red-50 text-red-700" : actionState === "saved" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-sky-200 bg-sky-50 text-sky-700"}`}>{actionMessage}</p>}

        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          {(!creative || creative.status === "DRAFT") && (
            <button 
              onClick={handleSave} 
              disabled={loading || actionState === "saving" || !headline.trim()}
              className="min-h-11 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
            >
              {actionState === "saving" ? "Menyimpan…" : "Simpan draf"}
            </button>
          )}
          {creative && creative.status === "DRAFT" && (
            <button 
              onClick={handleMarkReady}
              disabled={loading || actionState === "saving" || !headline.trim()}
              style={{ color: "#ffffff" }}
              className="min-h-11 rounded-xl bg-sky-600 px-4 py-2 text-sm font-bold transition-colors hover:bg-sky-700 disabled:opacity-50"
            >
              {actionState === "saving" ? "Memproses…" : "Tandai siap"}
            </button>
          )}
          {creative && creative.status === "READY" && (
            <div className="text-green-600 text-sm font-semibold flex items-center">
              Materi siap digunakan
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
