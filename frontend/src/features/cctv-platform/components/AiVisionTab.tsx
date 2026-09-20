"use client";

import { useMemo, useState } from "react";
import { CANONICAL_CAMERA_REGISTRY } from "../../international/cctv-registry";
import { CameraPlayer } from "./CameraPlayer";

/** No inference service is connected. A portal iframe is not a frame input. */
export function AiVisionTab() {
  const [cameraId, setCameraId] = useState(CANONICAL_CAMERA_REGISTRY[0]?.camera_id ?? "");
  const [search, setSearch] = useState("");
  const cameras = useMemo(() => CANONICAL_CAMERA_REGISTRY.filter(c => `${c.camera_name} ${c.district} ${c.camera_id}`.toLowerCase().includes(search.toLowerCase())), [search]);
  const camera = CANONICAL_CAMERA_REGISTRY.find(c => c.camera_id === cameraId);
  return <section className="flex min-w-0 flex-col gap-5 text-slate-900" aria-label="AI Vision">
    <header className="rounded-2xl border border-slate-200 bg-white p-5">
      <h2 className="text-xl font-bold">Analisis kamera</h2>
      <p className="mt-2 text-sm text-slate-700">Analisis membutuhkan frame kamera berizin dan layanan inferensi yang terhubung.</p>
      <p role="status" data-ai-status="UNAVAILABLE" className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
        UNAVAILABLE · Frame dan hasil inferensi belum tersedia. Jumlah objek, FPS, latensi, model, serta confidence belum dapat ditampilkan.
      </p>
    </header>
    <div className="grid min-w-0 gap-4 md:grid-cols-2">
      <label className="flex min-w-0 flex-col gap-2 text-sm font-semibold">Cari kamera atau wilayah
        <input className="min-h-11 rounded-lg border border-slate-400 bg-white px-3 text-slate-900" value={search} onChange={e => setSearch(e.target.value)} placeholder="Nama kamera / wilayah" />
      </label>
      <label className="flex min-w-0 flex-col gap-2 text-sm font-semibold">Kamera
        <select className="min-h-11 min-w-0 max-w-full rounded-lg border border-slate-400 bg-white px-3 text-slate-900" value={cameras.some(c => c.camera_id === cameraId) ? cameraId : ""} onChange={e => setCameraId(e.target.value)}>
          <option value="" disabled>{cameras.length ? "Pilih kamera" : "Tidak ada kamera yang cocok"}</option>
          {cameras.map(c => <option value={c.camera_id} key={c.camera_id}>{c.camera_name} · {c.district}</option>)}
        </select>
      </label>
    </div>
    {camera && <>
      <CameraPlayer key={camera.camera_id} camera={camera} />
      <dl className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 text-sm sm:grid-cols-2">
        <div><dt className="font-semibold">Sumber kamera</dt><dd>{camera.provider} · {camera.camera_name}</dd></div>
        <div><dt className="font-semibold">Waktu frame terakhir</dt><dd>{camera.last_frame_at ?? "Belum tersedia"}</dd></div>
        <div><dt className="font-semibold">Model dan confidence</dt><dd>Belum tersedia</dd></div>
        <div><dt className="font-semibold">Deteksi dan tracking</dt><dd>Belum tersedia</dd></div>
      </dl>
    </>}
    <p className="text-sm text-slate-700">Membuka portal resmi tidak mengaktifkan analisis AI. Tidak ada hasil deteksi yang disimpulkan dari daftar kamera.</p>
  </section>;
}
