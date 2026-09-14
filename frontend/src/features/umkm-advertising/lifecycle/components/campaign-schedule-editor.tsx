"use client";

import React, { useState, useEffect, useId } from "react";
import { UpdateScheduleInput } from "../types/lifecycle.types";
import { Calendar, Clock, Save, AlertCircle, Check, Sparkles } from "lucide-react";

interface CampaignScheduleEditorProps {
  initialStartAt: string | null;
  initialEndAt: string | null;
  canEdit: boolean;
  onSave: (input: UpdateScheduleInput) => Promise<any>;
  className?: string;
}

// The owner workspace contract is explicit Asia/Jakarta (UTC+7), independent of browser timezone.
export function toJakartaDatetimeLocal(isoString: string | null): string {
  if (!isoString) return "";
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return "";

  const jakarta = new Date(date.getTime() + 7 * 60 * 60 * 1000);

  const pad = (n: number) => n.toString().padStart(2, "0");
  const year = jakarta.getUTCFullYear();
  const month = pad(jakarta.getUTCMonth() + 1);
  const day = pad(jakarta.getUTCDate());
  const hours = pad(jakarta.getUTCHours());
  const minutes = pad(jakarta.getUTCMinutes());

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function fromJakartaDatetimeLocal(localString: string): string {
  if (!localString) return "";
  const date = new Date(`${localString}:00+07:00`);
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
  const fieldId = useId();
  const startFieldId = `${fieldId}-start`;
  const endFieldId = `${fieldId}-end`;
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
          setStartLocal(toJakartaDatetimeLocal(initialStartAt));
          setEndLocal(toJakartaDatetimeLocal(initialEndAt));
        } else {
          // Default to starting now and ending in 7 days
          const now = new Date();
          const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
          setStartLocal(toJakartaDatetimeLocal(now.toISOString()));
          setEndLocal(toJakartaDatetimeLocal(nextWeek.toISOString()));
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
    const baseDate = startLocal ? new Date(fromJakartaDatetimeLocal(startLocal)) : new Date();
    const newEnd = new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000);
    setEndLocal(toJakartaDatetimeLocal(newEnd.toISOString()));
    setFormError(null);
  };

  // Calculate human readable duration
  const getDurationInfo = () => {
    if (!startLocal || !endLocal) return null;
    const start = new Date(fromJakartaDatetimeLocal(startLocal)).getTime();
    const end = new Date(fromJakartaDatetimeLocal(endLocal)).getTime();

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

    const startIso = fromJakartaDatetimeLocal(startLocal);
    const endIso = fromJakartaDatetimeLocal(endLocal);

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
    } catch {
      setFormError("Jadwal promosi belum dapat disimpan. Coba lagi.");
    } finally {
      setIsSaving(false);
    }
  };

  const durationText = getDurationInfo();

  return (
    <div
      className={`rounded-xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}
    >
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-sky-600" />
            Pengaturan Jadwal Penayangan
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Tentukan rentang tanggal dan jam kapan iklan Anda akan aktif ditayangkan.
          </p>
        </div>

        <div className="text-right">
          <span className="inline-block text-[11px] font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-600">
            Waktu Lokal: WIB / UTC+7
          </span>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor={startFieldId} className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              Waktu Mulai Tayang
            </label>
            <input
              id={startFieldId}
              type="datetime-local"
              disabled={!canEdit || isSaving}
              style={{ color: "#0f172a" }}
              value={startLocal}
              onChange={(e) => {
                setStartLocal(e.target.value);
                setFormError(null);
              }}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100 disabled:bg-slate-100 disabled:text-slate-500"
            />
          </div>

          <div>
            <label htmlFor={endFieldId} className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              Waktu Selesai Tayang
            </label>
            <input
              id={endFieldId}
              type="datetime-local"
              disabled={!canEdit || isSaving}
              value={endLocal}
              onChange={(e) => {
                setEndLocal(e.target.value);
                setFormError(null);
              }}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100 disabled:bg-slate-100 disabled:text-slate-500"
            />
          </div>
        </div>

        {canEdit && (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-xs text-slate-500 flex items-center gap-1">
              <Sparkles className="h-3.5 w-3.5 text-sky-500" /> Preset Durasi:
            </span>
            <button
              type="button"
              onClick={() => applyPreset(3)}
              className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium transition-colors hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700"
            >
              +3 Hari
            </button>
            <button
              type="button"
              onClick={() => applyPreset(7)}
              className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium transition-colors hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700"
            >
              +7 Hari (1 Minggu)
            </button>
            <button
              type="button"
              onClick={() => applyPreset(14)}
              className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium transition-colors hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700"
            >
              +14 Hari (2 Minggu)
            </button>
            <button
              type="button"
              onClick={() => applyPreset(30)}
              className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium transition-colors hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700"
            >
              +30 Hari (1 Bulan)
            </button>
          </div>
        )}

        {durationText && (
          <div className="flex items-center justify-between rounded-lg border border-sky-200 bg-sky-50 p-2.5 text-xs text-sky-700">
            <span>
              Total Estimasi Durasi Tayang: <strong>{durationText}</strong>
            </span>
          </div>
        )}

        {formError && (
          <div className="flex items-center gap-2 p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        {saveSuccess && (
          <div className="flex items-center gap-2 p-3 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg">
            <Check className="w-4 h-4 shrink-0" />
            <span>Jadwal promosi berhasil disimpan.</span>
          </div>
        )}

        {canEdit ? (
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSaving}
              style={{ color: "#ffffff" }}
              className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              {isSaving ? "Menyimpan Jadwal..." : "Simpan Jadwal"}
            </button>
          </div>
        ) : (
          <div className="text-xs text-slate-500 italic pt-1">
            Jadwal tidak dapat diubah saat promosi aktif atau sudah selesai. Jeda promosi terlebih dahulu untuk mengubah waktu.
          </div>
        )}
      </form>
    </div>
  );
}
