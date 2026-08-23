"use client";

import { useState } from "react";
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
  const { state, response, error, askQuestion } = useAi();
  const [question, setQuestion] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || state === "LOADING") return;

    askQuestion({
      question: question.trim(),
      active_experience: activeExperience,
      context: {
        study_area_id: studyAreaId,
        selected_entity_id: selectedEntityId,
        origin: currentOrigin,
        destination: currentDestination,
      },
    });
  };

  return (
    <div className="ai-panel p-4 border border-border rounded-lg bg-surface flex flex-col gap-4 shadow-sm">
      <div className="ai-panel-header">
        <h3 className="font-bold text-lg text-foreground">Asisten GETRA AI</h3>
        <p className="text-sm text-muted-foreground">Konteks: {activeExperience}</p>
      </div>

      <div className="ai-panel-content min-h-[150px] max-h-[300px] overflow-y-auto bg-background rounded p-3 border border-border">
        {state === "IDLE" && (
          <p className="text-sm text-muted-foreground italic">
            Tanyakan tentang rute, halte terdekat, atau profil area...
          </p>
        )}

        {state === "LOADING" && (
          <p className="text-sm text-primary animate-pulse">Menghubungkan ke GETRA Data & AI...</p>
        )}

        {state === "ERROR" && (
          <p className="text-sm text-red-500 font-medium">Error: {error}</p>
        )}

        {state === "SUCCESS" && response && (
          <div className="ai-response space-y-3">
            <p className="text-sm text-foreground leading-relaxed">{response.answer}</p>
            
            {response.limitations.length > 0 && (
              <div className="mt-2 p-2 bg-orange-100/50 border border-orange-200 rounded text-xs">
                <span className="font-bold text-orange-800">Catatan/Batasan:</span>
                <ul className="list-disc list-inside mt-1 text-orange-700">
                  {response.limitations.map((lim, idx) => (
                    <li key={idx}>{lim}</li>
                  ))}
                </ul>
              </div>
            )}

            {response.evidence.length > 0 && (
              <div className="mt-2 text-xs text-muted-foreground">
                <strong>Sumber Data (Grounded):</strong>
                <ul className="list-disc list-inside mt-1">
                  {response.evidence.map((ev, idx) => (
                    <li key={idx}>
                      {ev.source} - {ev.dataset}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="ai-panel-form flex gap-2">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ketik pertanyaan Anda..."
          disabled={state === "LOADING"}
          className="flex-1 px-3 py-2 text-sm border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary bg-background text-foreground"
        />
        <button
          type="submit"
          disabled={!question.trim() || state === "LOADING"}
          className="px-4 py-2 text-sm font-medium text-background bg-primary rounded disabled:opacity-50 hover:bg-primary/90 transition-colors"
        >
          Tanya
        </button>
      </form>
    </div>
  );
}
