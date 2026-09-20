"use client";
import { useState, type ReactNode } from "react";
import Link from "next/link";

/** Legacy concept screens require deliberate opt-in and never masquerade as observations. */
export function SimulationGate({ children }: { children: ReactNode }) {
  const [enabled, setEnabled] = useState(false);
  return <section>
    <div role="status" className="sticky top-0 z-30 mb-4 rounded-xl border-2 border-amber-500 bg-amber-50 p-4 text-amber-950">
      <strong>{enabled ? "SIMULATION — DATA CONTOH" : "UNAVAILABLE — sumber data belum terhubung"}</strong>
      <p className="my-2 text-sm">Halaman konsep ini berisi data ilustrasi. Angka, status live, waktu, dan analisis di dalam simulasi tidak menggambarkan kondisi nyata.</p>
      <button type="button" className="min-h-11 rounded-lg border border-amber-900 px-4 font-semibold" onClick={() => setEnabled(!enabled)}>{enabled ? "Tutup simulasi" : "Buka simulasi berlabel"}</button>
      <Link className="ml-4 inline-block py-3 underline" href="/international">Buka data dari sumber nyata</Link>
    </div>
    {enabled && <div data-mode="SIMULATION">{children}</div>}
  </section>;
}
