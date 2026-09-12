"use client";

import { useEffect, useRef, useState } from "react";
import { Eraser, LoaderCircle, Minus, SendHorizontal, Sparkles, X } from "lucide-react";
import { useAi } from "@/src/hooks/use-ai";
import type { AiSearchAction, SearchCriteria } from "@/types/search-recommendation";
export type { AiSearchAction } from "@/types/search-recommendation";

interface AiPanelProps {
  onSearchAction?: (action: AiSearchAction) => Promise<string>;
  onMinimize?: () => void;
  onClose?: () => void;
  searchContext?: SearchCriteria;
  getSearchRevision?: () => number;
  activeExperience: "GENERAL" | "UMKM" | "INVESTOR" | "GOVERNMENT";
  currentOrigin?: { latitude: number; longitude: number };
  currentDestination?: { latitude: number; longitude: number };
  selectedEntityId?: string;
  studyAreaId?: string;
}

export function AiPanel({ activeExperience, currentOrigin, currentDestination, selectedEntityId,
  studyAreaId, onSearchAction, searchContext, getSearchRevision, onMinimize, onClose }: AiPanelProps) {
  const { state, messages, askQuestion, clearChat } = useAi();
  const [question, setQuestion] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { const node = scrollRef.current; if (node) node.scrollTop = node.scrollHeight; }, [messages, state]);

  const submit = (text: string) => {
    if (!text.trim() || state === "LOADING") return;
    const searchRevision = getSearchRevision?.();
    void askQuestion({ question: text.trim(), active_experience: activeExperience,
      context: { study_area_id: studyAreaId, selected_entity_id: selectedEntityId,
        origin: currentOrigin, destination: currentDestination,
        enable_search: Boolean(onSearchAction), search_context: searchContext } }, async response => {
      if (getSearchRevision?.() !== searchRevision) return "Pencarian sudah Anda ubah. Kirim ulang pertanyaan untuk memakai kebutuhan terbaru.";
      if (response.search_action && onSearchAction) return onSearchAction(response.search_action);
    });
    setQuestion("");
  };
  const suggestions = searchContext ? ["Yang paling dekat saja", "Budget 20 ribu", "Tempat lain di sekitar sini"]
    : ["Cari tempat makan di sekitar saya", "Apa yang menarik di area ini?", "Jelaskan rute ke tujuan ini"];

  return <section className="tanya-getra" aria-label="Tanya GETRA">
    <header className="tanya-getra__header">
      <Sparkles size={25} aria-hidden="true" />
      <div><h3>Tanya GETRA</h3><p>Asisten AI untuk eksplorasi kota</p></div>
      <div className="tanya-getra__actions">
        {onMinimize ? <button type="button" aria-label="Minimalkan Tanya GETRA" onClick={onMinimize}><Minus size={17} /></button> : null}
        {onClose ? <button type="button" aria-label="Tutup Tanya GETRA" onClick={onClose}><X size={18} /></button> : null}
      </div>
    </header>
    <div className="tanya-getra__messages" ref={scrollRef} role="log" aria-live="polite" aria-relevant="additions text">
      {!messages.length ? <div className="tanya-getra__welcome"><Sparkles size={24} /><strong>Apa yang ingin Anda cari?</strong><p>Ceritakan jenis tempat, anggaran, dan lokasi yang Anda inginkan.</p></div> : null}
      {messages.map((message, index) => <div key={index} className="tanya-getra__message" data-role={message.role}>
        {message.role === "assistant" ? <span className="tanya-getra__avatar" aria-hidden="true"><Sparkles size={16} /></span> : null}
        <p>{message.content}</p>
      </div>)}
      {state === "LOADING" ? <p className="tanya-getra__loading" role="status"><LoaderCircle size={16} className="animate-spin" />Memproses kebutuhan Anda...</p> : null}
      {state === "ERROR" ? <div className="tanya-getra__error" role="alert"><p>Tanya GETRA belum dapat memproses permintaan ini. Coba lagi.</p><button type="button" onClick={() => { const last = [...messages].reverse().find(message => message.role === "user"); if (last) submit(last.content); }}>Coba lagi</button></div> : null}
    </div>
    <div className="tanya-getra__suggestions">{suggestions.map(text => <button type="button" key={text} disabled={state === "LOADING"} onClick={() => submit(text)}>{text}</button>)}</div>
    <form onSubmit={event => { event.preventDefault(); submit(question); }} className="tanya-getra__form">
      <input ref={inputRef} aria-label="Pertanyaan untuk Tanya GETRA" maxLength={1000} value={question} onChange={event => setQuestion(event.target.value)} placeholder="Tanyakan apa saja..." disabled={state === "LOADING"} />
      <button type="submit" aria-label="Kirim pertanyaan" disabled={!question.trim() || state === "LOADING"}><SendHorizontal size={18} /></button>
    </form>
    <footer>{messages.length ? <button type="button" disabled={state === "LOADING"} onClick={() => { clearChat(); inputRef.current?.focus(); }}><Eraser size={12} />Bersihkan percakapan</button> : <span>Jawaban berdasarkan data GETRA yang tersedia.</span>}</footer>
  </section>;
}
