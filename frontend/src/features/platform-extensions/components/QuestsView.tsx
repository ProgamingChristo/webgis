"use client";

import { useState } from "react";
import Link from "next/link";
import { Trophy, Award, CheckCircle2, Sparkles, ArrowRight } from "lucide-react";
import { COMMUNITY_QUESTS } from "../data";

export function QuestsView() {
  const [activeQuests, setActiveQuests] = useState(COMMUNITY_QUESTS);

  const totalXp = activeQuests.reduce((acc, q) => acc + (q.completedCount >= q.targetCount ? q.xpReward : 0), 0);

  const handleProgress = (questId: string) => {
    setActiveQuests((prev) =>
      prev.map((q) => {
        if (q.id === questId && q.completedCount < q.targetCount) {
          return { ...q, completedCount: q.completedCount + 1 };
        }
        return q;
      })
    );
  };

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-4 sm:p-6 lg:p-8">
      {/* Intro Banner */}
      <section className="rounded-2xl border border-yellow-100 bg-gradient-to-r from-amber-950 to-slate-900 p-6 text-white shadow-md">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-yellow-500/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-yellow-300">
              <Trophy size={14} /> Misi Warga & Sains Partisipatif
            </span>
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
              Tantangan Pemetaan Komunitas & Reputasi Warga
            </h1>
            <p className="max-w-2xl text-sm leading-relaxed text-amber-100">
              Ikuti misi pemetaan lapangan sederhana: verifikasi akses ramah disabilitas, laporkan trotoar rusak, atau perbarui data jam buka UMKM untuk mengumpulkan poin kontribusi dan lencana kehormatan.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/community"
              className="inline-flex items-center gap-2 rounded-xl bg-yellow-500 px-4 py-2.5 text-sm font-bold text-slate-950 shadow hover:bg-yellow-400 transition"
            >
              <Award size={16} /> Buka Ruang Komunitas
            </Link>
          </div>
        </div>
      </section>

      {/* User Progress Strip */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-800 font-black text-xl">
            🏅
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Peringkat Kontributor Anda
            </span>
            <h3 className="text-base font-black text-slate-900">Relawan Pemetaan Perkotaan</h3>
          </div>
        </div>

        <div className="flex items-center gap-6 text-xs font-semibold">
          <div>
            <span className="text-slate-400 block">Total Poin Terkumpul:</span>
            <span className="text-lg font-black text-amber-600">{totalXp} XP</span>
          </div>
          <div>
            <span className="text-slate-400 block">Misi Aktif:</span>
            <span className="text-lg font-black text-slate-900">{activeQuests.length} tantangan</span>
          </div>
        </div>
      </div>

      {/* Quests List */}
      <div className="space-y-4">
        <h2 className="text-base font-black text-slate-900">
          Misi yang Dapat Dikerjakan ({activeQuests.length})
        </h2>

        <div className="grid gap-6 md:grid-cols-3">
          {activeQuests.map((q) => {
            const isCompleted = q.completedCount >= q.targetCount;
            const progressPercent = Math.min(100, Math.round((q.completedCount / q.targetCount) * 100));

            return (
              <div
                key={q.id}
                className={`flex flex-col justify-between rounded-2xl border p-5 shadow-xs transition ${
                  isCompleted
                    ? "border-emerald-200 bg-emerald-50/40"
                    : "border-slate-200 bg-white hover:shadow-md"
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700 uppercase">
                      {q.category}
                    </span>
                    <span className="rounded bg-amber-50 px-2 py-0.5 text-xs font-black text-amber-700">
                      +{q.xpReward} XP
                    </span>
                  </div>

                  <h3 className="text-base font-black text-slate-900 mt-2">{q.title}</h3>
                  <p className="mt-1 text-xs text-slate-500 leading-relaxed">{q.description}</p>

                  {/* Progress bar */}
                  <div className="mt-4 space-y-1.5">
                    <div className="flex justify-between text-xs font-semibold">
                      <span>Progres:</span>
                      <span className="font-bold text-slate-900">
                        {q.completedCount} / {q.targetCount} ({progressPercent}%)
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          isCompleted ? "bg-emerald-500" : "bg-amber-500"
                        }`}
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>

                  <div className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                    <Sparkles size={13} className="text-amber-500" />
                    <span>Membuka Lencana: <strong>{q.badgeUnlock}</strong></span>
                  </div>
                </div>

                <div className="mt-6 border-t border-slate-100 pt-4 flex items-center justify-between">
                  {isCompleted ? (
                    <span className="inline-flex items-center gap-1 text-xs font-black text-emerald-600">
                      <CheckCircle2 size={15} /> Selesai & Terverifikasi
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleProgress(q.id)}
                      className="inline-flex items-center gap-1 rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-800 transition"
                    >
                      Catat 1 Progres <ArrowRight size={13} />
                    </button>
                  )}

                  <Link href="/app" className="text-xs font-bold text-sky-600 hover:text-sky-700">
                    Buka Peta
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
