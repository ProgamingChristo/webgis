"use client";

import {
  AlertTriangle,
  Bot,
  Eraser,
  LoaderCircle,
  MapPinned,
  MessageSquareText,
  Route,
  SendHorizontal,
  Sparkles,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAi } from "@/src/hooks/use-ai";

interface AiPanelProps {
  activeExperience: "GENERAL" | "UMKM" | "INVESTOR" | "GOVERNMENT";
  currentOrigin?: { latitude: number; longitude: number };
  currentDestination?: { latitude: number; longitude: number };
  selectedEntityId?: string;
  studyAreaId?: string;
}

export function AiPanel({
  activeExperience,
  currentOrigin,
  currentDestination,
  selectedEntityId,
  studyAreaId,
}: AiPanelProps) {
  const { state, messages, error, askQuestion, clearChat } = useAi();
  const [question, setQuestion] = useState("");
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = scrollRef.current;
    if (node) {
      node.scrollTop = node.scrollHeight;
    }
  }, [messages, state]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || state === "LOADING") return;

    void askQuestion({
      question: question.trim(),
      active_experience: activeExperience,
      context: {
        study_area_id: studyAreaId,
        selected_entity_id: selectedEntityId,
        origin: currentOrigin,
        destination: currentDestination,
      },
    });
    setQuestion("");
  };

  const contextLabel =
    activeExperience === "GENERAL"
      ? "General"
      : activeExperience === "GOVERNMENT"
        ? "Pemerintah"
        : activeExperience;

  const suggestions = [
    "Rekomendasikan rute ke tujuan ini",
    "Apa insight area terdekat?",
    "Titik mana yang paling mudah dijangkau?",
  ];

  const hasRouteContext =
    Boolean(currentOrigin) || Boolean(currentDestination);

  return (
    <section className="relative overflow-hidden rounded-[1.6rem] border border-cyan-300/18 bg-[linear-gradient(145deg,rgba(34,211,238,0.1),rgba(154,242,74,0.045)_42%,rgba(5,11,18,0.92))] p-4 shadow-[0_18px_55px_rgba(0,0,0,0.32)]">
      <div
        className="pointer-events-none absolute -right-14 -top-16 size-40 rounded-full bg-cyan-300/12 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-20 left-8 size-36 rounded-full bg-lime-300/8 blur-3xl"
        aria-hidden="true"
      />

      <header className="relative flex items-start justify-between gap-3">
        <div className="flex min-w-0 gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl border border-cyan-200/35 bg-cyan-300/10 text-cyan-200 shadow-[0_0_32px_rgba(34,211,238,0.14)]">
            <Bot size={21} />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-200">
              Spatial assistant
            </p>
            <h3 className="mt-1 text-xl font-black tracking-[-0.03em] text-white">
              Asisten GETRA AI
            </h3>
            <p className="mt-1 text-xs leading-5 text-slate-400">
              Tanya rute, area, akses, dan konteks titik berdasarkan data peta aktif.
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="rounded-full border border-lime-300/25 bg-lime-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-lime-200">
            {contextLabel}
          </span>
          {messages.length > 0 && (
            <button
              type="button"
              onClick={clearChat}
              className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-bold text-slate-300 transition hover:border-rose-300/40 hover:text-rose-200"
              title="Bersihkan percakapan"
            >
              <Eraser size={12} />
              Clear
            </button>
          )}
        </div>
      </header>

      <div className="relative mt-4 grid grid-cols-2 gap-2">
        <span className="inline-flex min-h-9 items-center gap-2 rounded-2xl border border-white/8 bg-slate-950/45 px-3 text-[11px] font-bold text-slate-300">
          <MapPinned size={14} className="text-cyan-200" />
          {selectedEntityId ? "Titik dipilih" : "Belum pilih titik"}
        </span>
        <span className="inline-flex min-h-9 items-center gap-2 rounded-2xl border border-white/8 bg-slate-950/45 px-3 text-[11px] font-bold text-slate-300">
          <Route size={14} className="text-lime-200" />
          {hasRouteContext ? "Konteks rute aktif" : "Rute belum aktif"}
        </span>
      </div>

      <div
        ref={scrollRef}
        className="relative mt-4 min-h-[172px] max-h-[340px] space-y-3 overflow-y-auto rounded-[1.35rem] border border-white/10 bg-slate-950/62 p-4 shadow-inner shadow-black/20"
      >
        {messages.length === 0 && state !== "LOADING" && (
          <div className="grid gap-4">
            <div className="flex gap-3">
              <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-cyan-300/10 text-cyan-200">
                <MessageSquareText size={16} />
              </span>
              <div>
                <p className="text-sm font-semibold leading-6 text-slate-100">
                  Mau cari insight apa?
                </p>
                <p className="mt-1 text-sm leading-6 text-slate-400">
                  Contoh: “apakah tujuan ini mudah dijangkau dari lokasi saya?”
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((item) => (
                <button
                  className="rounded-full border border-cyan-300/18 bg-cyan-300/[0.055] px-3 py-2 text-left text-[11px] font-bold text-cyan-100 transition hover:border-cyan-300/55 hover:bg-cyan-300/10"
                  key={item}
                  onClick={() => setQuestion(item)}
                  type="button"
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.role === "assistant" && (
              <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-cyan-300/10 text-cyan-200">
                <Bot size={14} />
              </span>
            )}
            <div
              className={`max-w-[82%] rounded-2xl border px-3.5 py-2.5 text-sm leading-6 ${
                msg.role === "user"
                  ? "border-lime-300/30 bg-lime-300/10 text-lime-50"
                  : "border-cyan-300/15 bg-cyan-300/[0.045] text-slate-100"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {state === "LOADING" && (
          <div className="flex items-center gap-3 rounded-2xl border border-cyan-300/16 bg-cyan-300/[0.055] p-3 text-sm font-bold text-cyan-100">
            <LoaderCircle className="animate-spin" size={17} />
            Menghubungkan ke GETRA Data & AI...
          </div>
        )}

        {state === "ERROR" && (
          <div className="flex items-start gap-3 rounded-2xl border border-rose-300/20 bg-rose-400/10 p-3 text-sm text-rose-100">
            <AlertTriangle className="mt-0.5 shrink-0" size={17} />
            <div>
              <strong className="block text-rose-100">
                GETRA AI belum bisa menjawab.
              </strong>
              <span className="mt-1 block leading-6 text-rose-200/85">{error}</span>
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="relative mt-4 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ketik pertanyaan Anda..."
          disabled={state === "LOADING"}
          className="min-h-12 w-full rounded-2xl border border-cyan-300/18 bg-slate-950/72 px-4 text-sm font-medium text-slate-100 outline-none transition placeholder:text-slate-500 hover:border-cyan-300/38 focus:border-cyan-300 focus:ring-4 focus:ring-cyan-300/10 disabled:cursor-wait disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={!question.trim() || state === "LOADING"}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-lime-300 to-cyan-300 px-5 text-sm font-black text-slate-950 shadow-[0_14px_32px_rgba(34,211,238,0.2)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-45"
        >
          <SendHorizontal size={16} />
          Tanya
        </button>
      </form>

      <p className="mt-3 flex items-center gap-2 text-[10px] font-medium text-slate-500">
        <Sparkles size={12} className="text-cyan-200" />
        Jawaban dihitung dari fakta GIS & data terverifikasi, lalu diinterpretasi AI.
      </p>
    </section>
  );
}
