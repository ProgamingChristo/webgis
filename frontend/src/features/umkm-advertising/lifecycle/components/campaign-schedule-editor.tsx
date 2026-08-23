"use client";

import React, { useState, useEffect } from "react";
import { UpdateScheduleInput } from "../types/lifecycle.types";
import { Calendar, Clock, Save, AlertCircle, Check, Sparkles } from "lucide-react";

interface CampaignScheduleEditorProps {
  initialStartAt: string | null;
  initialEndAt: string | null;
  canEdit: boolean;
  onSave: (input: UpdateScheduleInput) => Promise<any>;
  className?: string;
}

// Convert UTC ISO string to datetime-local formatted string (YYYY-MM-DDTHH:mm)
function toDatetimeLocal(isoString: string | null): string {
  if (!isoString) return "";
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return "";

  const pad = (n: number) => n.toString().padStart(2, "0");
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

// Convert datetime-local string to standard UTC ISO string
function fromDatetimeLocal(localString: string): string {
  if (!localString) return "";
  const date = new Date(localString);
  if (isNaN(date.getTime())) return "";
  return date.toISOString();
}

export function CampaignScheduleEditor({
  initialStartAt,
  initialEndAt,
  canEdit,
  onSave,
  className = "",
}: CampaignScheduleEditorProps) {
  const [startLocal, setStartLocal] = useState<string>("");
  const [endLocal, setEndLocal] = useState<string>("");
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Initialize or reset form when initial props change
  useEffect(() => {
    const timeoutId = window.setTimeout(
      () => {
        if (initialStartAt && initialEndAt) {
          setStartLocal(toDatetimeLocal(initialStartAt));
          setEndLocal(toDatetimeLocal(initialEndAt));
        } else {
          // Default to starting now and ending in 7 days
          const now = new Date();
          const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
          setStartLocal(toDatetimeLocal(now.toISOString()));
          setEndLocal(toDatetimeLocal(nextWeek.toISOString()));
        }
      },
      0,
    );

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [initialStartAt, initialEndAt]);

  // Apply duration preset from current start time
  const applyPreset = (days: number) => {
    const baseDate = startLocal ? new Date(startLocal) : new Date();
    const newEnd = new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000);
    setEndLocal(toDatetimeLocal(newEnd.toISOString()));
    setFormError(null);
  };

  // Calculate human readable duration
  const getDurationInfo = () => {
    if (!startLocal || !endLocal) return null;
    const start = new Date(startLocal).getTime();
    const end = new Date(endLocal).getTime();

    if (isNaN(start) || isNaN(end) || end <= start) return null;

    const diffHours = Math.round((end - start) / (1000 * 60 * 60));
    const days = Math.floor(diffHours / 24);
    const remainingHours = diffHours % 24;

    if (days > 0) {
      return `${days} hari ${remainingHours > 0 ? `${remainingHours} jam` : ""} (${diffHours} jam)`;
    }
    return `${diffHours} jam`;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSaveSuccess(false);

    if (!startLocal || !endLocal) {
      setFormError("Waktu mulai dan selesai wajib diisi.");
      return;
    }

    const startIso = fromDatetimeLocal(startLocal);
    const endIso = fromDatetimeLocal(endLocal);

    const startMs = new Date(startIso).getTime();
    const endMs = new Date(endIso).getTime();
    const nowMs = Date.now();

    if (isNaN(startMs) || isNaN(endMs)) {
      setFormError("Format tanggal dan waktu tidak valid.");
      return;
    }

    if (endMs <= startMs) {
      setFormError("Waktu selesai harus lebih besar dari waktu mulai.");
      return;
    }

    if (endMs <= nowMs) {
      setFormError("Waktu selesai tidak boleh berada di masa lalu.");
      return;
    }

    try {
      setIsSaving(true);
      await onSave({
        start_at: startIso,
        end_at: endIso,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setFormError(err?.message || "Gagal menyimpan jadwal campaign.");
    } finally {
      setIsSaving(false);
    }
  };

  const durationText = getDurationInfo();

  return (
    <div
      className={`rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 ${className}`}
    >
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Calendar className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            Pengaturan Jadwal Penayangan
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Tentukan rentang tanggal dan jam kapan iklan Anda akan aktif ditayangkan.
          </p>
        </div>

        <div className="text-right">
          <span className="inline-block text-[11px] font-medium px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
            Waktu Lokal: WIB / UTC+7
          </span>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              Waktu Mulai Tayang
            </label>
            <input
              type="datetime-local"
              disabled={!canEdit || isSaving}
              value={startLocal}
              onChange={(e) => {
                setStartLocal(e.target.value);
                setFormError(null);
              }}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 disabled:bg-slate-100 disabled:text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:disabled:bg-slate-900/60"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              Waktu Selesai Tayang
            </label>
            <input
              type="datetime-local"
              disabled={!canEdit || isSaving}
              value={endLocal}
              onChange={(e) => {
                setEndLocal(e.target.value);
                setFormError(null);
              }}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 disabled:bg-slate-100 disabled:text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:disabled:bg-slate-900/60"
            />
          </div>
        </div>

        {canEdit && (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-purple-500" /> Preset Durasi:
            </span>
            <button
              type="button"
              onClick={() => applyPreset(3)}
              className="px-2.5 py-1 text-xs font-medium rounded-md border border-slate-200 bg-slate-50 hover:bg-purple-50 hover:text-purple-700 hover:border-purple-200 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-purple-950 dark:hover:text-purple-300 transition-colors"
            >
              +3 Hari
            </button>
            <button
              type="button"
              onClick={() => applyPreset(7)}
              className="px-2.5 py-1 text-xs font-medium rounded-md border border-slate-200 bg-slate-50 hover:bg-purple-50 hover:text-purple-700 hover:border-purple-200 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-purple-950 dark:hover:text-purple-300 transition-colors"
            >
              +7 Hari (1 Minggu)
            </button>
            <button
              type="button"
              onClick={() => applyPreset(14)}
              className="px-2.5 py-1 text-xs font-medium rounded-md border border-slate-200 bg-slate-50 hover:bg-purple-50 hover:text-purple-700 hover:border-purple-200 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-purple-950 dark:hover:text-purple-300 transition-colors"
            >
              +14 Hari (2 Minggu)
            </button>
            <button
              type="button"
              onClick={() => applyPreset(30)}
              className="px-2.5 py-1 text-xs font-medium rounded-md border border-slate-200 bg-slate-50 hover:bg-purple-50 hover:text-purple-700 hover:border-purple-200 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-purple-950 dark:hover:text-purple-300 transition-colors"
            >
              +30 Hari (1 Bulan)
            </button>
          </div>
        )}

        {durationText && (
          <div className="text-xs text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900/50 p-2.5 rounded-lg flex items-center justify-between">
            <span>
              Total Estimasi Durasi Tayang: <strong>{durationText}</strong>
            </span>
          </div>
        )}

        {formError && (
          <div className="flex items-center gap-2 p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg dark:bg-rose-950/40 dark:border-rose-900/50 dark:text-rose-300">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        {saveSuccess && (
          <div className="flex items-center gap-2 p-3 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg dark:bg-emerald-950/40 dark:border-emerald-900/50 dark:text-emerald-300">
            <Check className="w-4 h-4 shrink-0" />
            <span>Jadwal campaign berhasil disimpan!</span>
          </div>
        )}

        {canEdit ? (
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-purple-600 rounded-lg shadow-sm hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
              {isSaving ? "Menyimpan Jadwal..." : "Simpan Jadwal"}
            </button>
          </div>
        ) : (
          <div className="text-xs text-slate-500 dark:text-slate-400 italic pt-1">
            Jadwal tidak dapat diubah saat campaign aktif atau telah selesai. Pause campaign terlebih dahulu jika perlu melakukan revisi waktu.
          </div>
        )}
      </form>
    </div>
  );
}
