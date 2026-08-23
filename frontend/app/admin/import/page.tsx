"use client";

import {
  ArrowLeft,
  CheckCircle2,
  CloudDownload,
  Database,
  FileJson2,
  Globe2,
  Layers3,
  LoaderCircle,
  MapPinned,
  Pencil,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/src/components/providers/AuthProvider";
import {
  adminMapImportService,
  type AdminImportedLayer,
} from "@/src/services/admin-map-import.service";

type ImportMode = "PUBLIC_API_URL" | "JSON_PAYLOAD";

export default function AdminImportPage() {
  const router = useRouter();
  const { context } = useAuth();
  const isAdmin = context?.profile?.account_role === "ADMIN";
  const [mode, setMode] = useState<ImportMode>("PUBLIC_API_URL");
  const [layerName, setLayerName] = useState("Data lokasi import");
  const [url, setUrl] = useState("");
  const [jsonText, setJsonText] = useState("");
  const [previewing, setPreviewing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [layer, setLayer] = useState<AdminImportedLayer | null>(null);
  const [savedLayers, setSavedLayers] = useState<AdminImportedLayer[]>([]);
  const [deletingLayerId, setDeletingLayerId] = useState<string | null>(null);
  const [updatingLayerId, setUpdatingLayerId] = useState<string | null>(null);

  const previewExamples = useMemo(
    () => [
      "GeoJSON FeatureCollection",
      "Array objek dengan latitude dan longitude",
      "Respons API dengan features atau records",
    ],
    [],
  );

  async function loadSavedLayers() {
    if (!isAdmin) {
      return;
    }

    const result = await adminMapImportService.list();
    setSavedLayers(result.layers);
  }

  useEffect(() => {
    if (!isAdmin) {
      return;
    }

    let active = true;

    void adminMapImportService
      .list()
      .then((result) => {
        if (active) {
          setSavedLayers(result.layers);
        }
      })
      .catch(() => {
        // Riwayat tidak menghalangi admin menyiapkan import baru.
      });

    return () => {
      active = false;
    };
  }, [isAdmin]);

  if (!isAdmin) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#050a10] p-6 text-slate-100">
        <section className="w-full max-w-md rounded-3xl border border-cyan-400/15 bg-slate-950/80 p-8 text-center shadow-2xl shadow-cyan-950/20">
          <ShieldCheck className="mx-auto mb-5 text-cyan-300" size={34} />
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-300">
            Admin only
          </p>
          <h1 className="mt-3 text-2xl font-semibold">Akses admin dibutuhkan</h1>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            Halaman import hanya tersedia untuk akun dengan account_role ADMIN.
          </p>
        </section>
      </main>
    );
  }

  async function handlePreview() {
    setPreviewing(true);
    setError(null);
    setSuccess(null);
    setLayer(null);

    try {
      const trimmedLayerName = layerName.trim() || "Data lokasi import";
      const result =
        mode === "PUBLIC_API_URL"
          ? await adminMapImportService.preview({
              source_type: "PUBLIC_API_URL",
              url: url.trim(),
              layer_name: trimmedLayerName,
            })
          : await adminMapImportService.preview({
              source_type: "JSON_PAYLOAD",
              payload: JSON.parse(jsonText) as unknown,
              layer_name: trimmedLayerName,
            });

      setLayer(result);
    } catch (previewError) {
      setError(
        previewError instanceof Error
          ? previewError.message
          : "Preview import gagal.",
      );
    } finally {
      setPreviewing(false);
    }
  }

  async function handleCommit() {
    if (!layer) {
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const committed = await adminMapImportService.commit(layer);
      setLayer(committed);
      setSavedLayers((current) => [
        committed,
        ...current.filter((item) => item.layer_id !== committed.layer_id),
      ]);
      setSuccess(
        committed.total_features +
          " titik dan " +
          (committed.regions?.length ?? 0) +
          " batas cakupan berhasil disimpan ke database.",
      );
    } catch (commitError) {
      setError(
        commitError instanceof Error
          ? commitError.message
          : "Penyimpanan database gagal.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteLayer(savedLayer: AdminImportedLayer) {
    const approved = window.confirm(
      `Hapus layer "${savedLayer.layer_name}" dari database? Semua titik dan batas cakupan hasil import layer ini akan dihapus.`,
    );

    if (!approved) {
      return;
    }

    setDeletingLayerId(savedLayer.layer_id);
    setError(null);
    setSuccess(null);

    try {
      const result = await adminMapImportService.deleteLayer(
        savedLayer.layer_id,
      );

      setSavedLayers((current) =>
        current.filter((item) => item.layer_id !== savedLayer.layer_id),
      );

      if (layer?.layer_id === savedLayer.layer_id) {
        setLayer(null);
      }

      setSuccess(
        `Layer "${savedLayer.layer_name}" dihapus: ${result.deleted_merchants} titik dan ${result.deleted_study_areas} batas cakupan.`,
      );
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Layer import gagal dihapus.",
      );
    } finally {
      setDeletingLayerId(null);
    }
  }

  async function handleRenameLayer(savedLayer: AdminImportedLayer) {
    const nextName = window.prompt(
      "Nama layer baru",
      savedLayer.layer_name,
    );

    if (!nextName || nextName.trim() === savedLayer.layer_name) {
      return;
    }

    setUpdatingLayerId(savedLayer.layer_id);
    setError(null);
    setSuccess(null);

    try {
      const result = await adminMapImportService.updateLayer(
        savedLayer.layer_id,
        nextName.trim(),
      );

      setSavedLayers((current) =>
        current.map((item) =>
          item.layer_id === savedLayer.layer_id
            ? {
                ...item,
                layer_name: result.layer_name,
                merchants: item.merchants.map((merchant) => ({
                  ...merchant,
                  source: result.layer_name,
                })),
              }
            : item,
        ),
      );

      setSuccess(
        `Layer diperbarui: ${result.updated_merchants} titik dan ${result.updated_study_areas} batas cakupan.`,
      );
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Layer import gagal diperbarui.",
      );
    } finally {
      setUpdatingLayerId(null);
    }
  }

  async function handleFile(file: File | null) {
    if (!file) {
      return;
    }

    if (file.size > 1_048_576) {
      setError("Ukuran file maksimal 1 MB untuk satu proses import.");
      return;
    }

    setJsonText(await file.text());
    setMode("JSON_PAYLOAD");
    setLayerName(
      file.name.replace(/\.(geo)?json$/i, "") || "Data lokasi import",
    );
    setError(null);
  }

  return (
    <main className="min-h-screen bg-[#050a10] bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.12),transparent_28%),radial-gradient(circle_at_80%_10%,rgba(154,242,74,0.08),transparent_24%)] px-4 py-5 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <nav className="mb-5 flex items-center justify-between rounded-2xl border border-white/8 bg-slate-950/65 px-4 py-3 backdrop-blur-xl">
          <button
            className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/5 hover:text-cyan-300"
            type="button"
            onClick={() => router.push("/")}
          >
            <ArrowLeft size={16} />
            Dashboard
          </button>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-300">
            <ShieldCheck size={15} />
            Admin workspace
          </div>
        </nav>

        <header className="relative overflow-hidden rounded-3xl border border-cyan-300/15 bg-slate-950/75 p-6 shadow-2xl shadow-cyan-950/25 backdrop-blur-xl sm:p-8">
          <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-cyan-400/10 blur-3xl" />
          <div className="relative max-w-3xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/8 px-3 py-1.5 text-xs font-semibold text-cyan-200">
              <Database size={14} />
              Persistent spatial ingestion
            </div>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Import data peta, periksa, lalu simpan.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-400 sm:text-base">
              GETRA membaca JSON atau API publik, menormalisasi koordinat,
              mendeteksi wilayah, membuat batas cakupan, lalu menyimpan hasilnya
              ke database agar tersedia di dashboard.
            </p>
          </div>
        </header>

        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.65fr)]">
          <form
            className="rounded-3xl border border-white/8 bg-slate-950/72 p-5 shadow-xl shadow-black/20 backdrop-blur-xl sm:p-6"
            onSubmit={(event) => {
              event.preventDefault();
              void handlePreview();
            }}
          >
            <div className="grid grid-cols-2 gap-2 rounded-2xl bg-white/[0.035] p-1.5">
              <ModeButton
                active={mode === "PUBLIC_API_URL"}
                icon={<Globe2 size={16} />}
                label="API publik"
                onClick={() => setMode("PUBLIC_API_URL")}
              />
              <ModeButton
                active={mode === "JSON_PAYLOAD"}
                icon={<FileJson2 size={16} />}
                label="JSON / GeoJSON"
                onClick={() => setMode("JSON_PAYLOAD")}
              />
            </div>

            <div className="mt-6 space-y-5">
              <ImportField label="Nama layer">
                <input
                  className="getra-input"
                  value={layerName}
                  onChange={(event) => setLayerName(event.target.value)}
                  placeholder="Contoh: Kuliner Jakarta Pusat 2026"
                  required
                />
              </ImportField>

              {mode === "PUBLIC_API_URL" ? (
                <ImportField
                  label="URL API publik"
                  hint="Query rahasia tidak disimpan ke metadata database."
                >
                  <div className="relative">
                    <CloudDownload
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
                      size={17}
                    />
                    <input
                      className="getra-input pl-11"
                      value={url}
                      onChange={(event) => setUrl(event.target.value)}
                      placeholder="https://domain.example/data.geojson"
                      type="url"
                      required
                    />
                  </div>
                </ImportField>
              ) : (
                <>
                  <ImportField label="Upload file">
                    <label className="flex cursor-pointer items-center justify-center gap-3 rounded-2xl border border-dashed border-cyan-300/25 bg-cyan-300/[0.035] px-5 py-7 text-sm text-slate-300 transition hover:border-cyan-300/55 hover:bg-cyan-300/[0.065]">
                      <Upload size={18} className="text-cyan-300" />
                      Pilih .json atau .geojson
                      <input
                        className="sr-only"
                        accept=".json,.geojson,application/json"
                        type="file"
                        onChange={(event) =>
                          void handleFile(event.target.files?.[0] ?? null)
                        }
                      />
                    </label>
                  </ImportField>
                  <ImportField label="Atau tempel JSON">
                    <textarea
                      className="getra-input min-h-48 resize-y py-3 font-mono text-xs leading-5"
                      value={jsonText}
                      onChange={(event) => setJsonText(event.target.value)}
                      placeholder='{"type":"FeatureCollection","features":[...]}'
                      required
                    />
                  </ImportField>
                </>
              )}
            </div>

            {error ? (
              <p className="mt-5 rounded-2xl border border-rose-400/20 bg-rose-400/8 px-4 py-3 text-sm text-rose-200">
                {error}
              </p>
            ) : null}

            {success ? (
              <p className="mt-5 flex items-start gap-2 rounded-2xl border border-emerald-400/20 bg-emerald-400/8 px-4 py-3 text-sm text-emerald-200">
                <CheckCircle2 className="mt-0.5 shrink-0" size={16} />
                {success}
              </p>
            ) : null}

            <button
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-cyan-300 px-5 py-3.5 text-sm font-bold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-wait disabled:opacity-60"
              type="submit"
              disabled={previewing || saving}
            >
              {previewing ? (
                <LoaderCircle className="animate-spin" size={17} />
              ) : (
                <Sparkles size={17} />
              )}
              {previewing ? "Menganalisis data..." : "Buat preview aman"}
            </button>
          </form>

          <aside className="space-y-5">
            <section className="rounded-3xl border border-white/8 bg-slate-950/72 p-5 backdrop-blur-xl sm:p-6">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-2xl bg-cyan-300/10 text-cyan-300">
                  <Layers3 size={19} />
                </span>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                    Pipeline
                  </p>
                  <h2 className="font-semibold">Normalisasi otomatis</h2>
                </div>
              </div>
              <ul className="mt-5 space-y-3">
                {previewExamples.map((example) => (
                  <li
                    className="flex gap-3 text-sm leading-5 text-slate-400"
                    key={example}
                  >
                    <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-300" size={15} />
                    {example}
                  </li>
                ))}
              </ul>
            </section>

            {layer ? (
              <section className="rounded-3xl border border-emerald-300/20 bg-emerald-300/[0.055] p-5 sm:p-6">
                <div className="flex items-center justify-between gap-3">
                  <span className="rounded-full bg-emerald-300/12 px-3 py-1 text-xs font-bold text-emerald-200">
                    {layer.persisted ? "TERSIMPAN" : "PREVIEW"}
                  </span>
                  <span className="text-xs text-slate-500">
                    {layer.source_type === "PUBLIC_API_URL" ? "API" : "JSON"}
                  </span>
                </div>
                <h2 className="mt-4 text-xl font-semibold">{layer.layer_name}</h2>
                <p className="mt-2 text-sm text-slate-300">
                  {layer.total_features.toLocaleString("id-ID")} titik valid
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {layer.merchants.slice(0, 5).map((merchant) => (
                    <span
                      className="max-w-full truncate rounded-lg border border-white/8 bg-black/15 px-2.5 py-1.5 text-xs text-slate-400"
                      key={merchant.id}
                    >
                      {merchant.name}
                    </span>
                  ))}
                </div>
                {layer.persisted ? (
                  <button
                    className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-300 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-emerald-200"
                    type="button"
                    onClick={() => router.push("/")}
                  >
                    <MapPinned size={17} />
                    Buka di dashboard
                  </button>
                ) : (
                  <button
                    className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-300 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-emerald-200 disabled:cursor-wait disabled:opacity-60"
                    type="button"
                    onClick={() => void handleCommit()}
                    disabled={saving}
                  >
                    {saving ? (
                      <LoaderCircle className="animate-spin" size={17} />
                    ) : (
                      <Database size={17} />
                    )}
                    {saving ? "Menyimpan..." : "Simpan ke database"}
                  </button>
                )}
              </section>
            ) : null}

            <section className="rounded-3xl border border-white/8 bg-slate-950/72 p-5 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                    Database
                  </p>
                  <h2 className="mt-1 font-semibold">Import tersimpan</h2>
                </div>
                <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-slate-400">
                  {savedLayers.length} layer
                </span>
              </div>
              <button
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-cyan-300/18 px-4 py-2.5 text-xs font-bold text-cyan-200 transition hover:border-cyan-300/60 hover:bg-cyan-300/8"
                type="button"
                onClick={() => void loadSavedLayers()}
              >
                <RefreshCw size={15} />
                Refresh data
              </button>
              <div className="mt-4 space-y-2">
                {savedLayers.length > 0 ? (
                  savedLayers.map((savedLayer) => (
                    <div
                      className="rounded-2xl border border-white/6 bg-white/[0.025] p-3.5"
                      key={savedLayer.layer_id}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <strong className="block truncate text-sm font-medium">
                            {savedLayer.layer_name}
                          </strong>
                          <span className="mt-1 block text-xs text-slate-500">
                            {savedLayer.total_features.toLocaleString("id-ID")} titik
                          </span>
                        </div>
                        <div className="flex shrink-0 gap-2">
                          <button
                            className="inline-grid size-9 place-items-center rounded-xl border border-cyan-300/20 text-cyan-200 transition hover:border-cyan-300/60 hover:bg-cyan-400/10 disabled:cursor-wait disabled:opacity-50"
                            type="button"
                            title="Rename layer import"
                            onClick={() => void handleRenameLayer(savedLayer)}
                            disabled={updatingLayerId === savedLayer.layer_id}
                          >
                            {updatingLayerId === savedLayer.layer_id ? (
                              <LoaderCircle className="animate-spin" size={15} />
                            ) : (
                              <Pencil size={15} />
                            )}
                          </button>

                          <button
                            className="inline-grid size-9 place-items-center rounded-xl border border-rose-300/20 text-rose-200 transition hover:border-rose-300/60 hover:bg-rose-400/10 disabled:cursor-wait disabled:opacity-50"
                            type="button"
                            title="Hapus layer import dari database"
                            onClick={() => void handleDeleteLayer(savedLayer)}
                            disabled={deletingLayerId === savedLayer.layer_id}
                          >
                            {deletingLayerId === savedLayer.layer_id ? (
                              <LoaderCircle className="animate-spin" size={15} />
                            ) : (
                              <Trash2 size={15} />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm leading-6 text-slate-500">
                    Belum ada layer hasil import di database.
                  </p>
                )}
              </div>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}

function ModeButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={
        active
          ? "flex items-center justify-center gap-2 rounded-xl bg-cyan-300 px-3 py-2.5 text-sm font-bold text-slate-950 shadow-lg shadow-cyan-950/20"
          : "flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-400 transition hover:bg-white/5 hover:text-slate-200"
      }
      type="button"
      onClick={onClick}
    >
      {icon}
      {label}
    </button>
  );
}

function ImportField({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
        {label}
      </span>
      {children}
      {hint ? (
        <span className="mt-2 block text-xs leading-5 text-slate-600">{hint}</span>
      ) : null}
    </label>
  );
}
