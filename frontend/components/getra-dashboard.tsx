"use client";

import { useCallback, useMemo, useState } from "react";
import {
  Bot,
  Clock3,
  Database,
  Footprints,
  Layers3,
  MapPinned,
  Search,
  ShieldCheck,
} from "lucide-react";
import { GetraMap } from "@/components/getra-map";
import { DEMO_MERCHANTS, PILOT_ORIGIN } from "@/data/demo-merchants";
import type { Merchant } from "@/types/getra";

const CATEGORY_OPTIONS = ["Semua", "Kopi", "Makanan", "Minimarket", "Apotek", "Jasa"] as const;

type CategoryFilter = (typeof CATEGORY_OPTIONS)[number];

export function GetraDashboard() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<CategoryFilter>("Semua");
  const [maxMinutes, setMaxMinutes] = useState(10);
  const [openOnly, setOpenOnly] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(DEMO_MERCHANTS[0]?.id ?? null);

  const merchants = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return DEMO_MERCHANTS.filter((merchant) => {
      if (category !== "Semua" && merchant.category !== category) return false;
      if (merchant.walkingMinutes > maxMinutes) return false;
      if (openOnly && !merchant.openNow) return false;
      if (
        normalizedQuery &&
        !`${merchant.name} ${merchant.category} ${merchant.priceLabel}`
          .toLowerCase()
          .includes(normalizedQuery)
      ) {
        return false;
      }
      return true;
    }).sort((a, b) => {
      if (a.walkingMinutes !== b.walkingMinutes) return a.walkingMinutes - b.walkingMinutes;
      return b.accessibilityScore - a.accessibilityScore;
    });
  }, [category, maxMinutes, openOnly, query]);

  const selectedMerchant =
    merchants.find((merchant) => merchant.id === selectedId) ?? merchants[0] ?? null;

  const handleSelect = useCallback((merchant: Merchant) => {
    setSelectedId(merchant.id);
  }, []);

  return (
    <main className="workspace">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">G</div>
          <div>
            <strong>GETRA</strong>
            <span>Geo-Enabled Transit & Retail Analytics</span>
          </div>
        </div>

        <nav className="stakeholder-switch" aria-label="Mode stakeholder">
          <button className="stakeholder-button stakeholder-button--active">Komuter</button>
          <button className="stakeholder-button" disabled>UMKM</button>
          <button className="stakeholder-button" disabled>Investor</button>
          <button className="stakeholder-button" disabled>Pemerintah</button>
        </nav>

        <div className="pilot-badge">
          <ShieldCheck size={15} />
          Pilot · synthetic
        </div>
      </header>

      <section className="workspace-grid">
        <aside className="left-panel panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">Geo search</span>
              <h1>Cari layanan dari transit</h1>
            </div>
            <Search size={20} />
          </div>

          <div className="origin-box">
            <MapPinned size={17} />
            <div>
              <span>Origin pilot</span>
              <strong>{PILOT_ORIGIN.name}</strong>
            </div>
          </div>

          <label className="field-label" htmlFor="search-query">Pencarian</label>
          <div className="search-box">
            <Search size={17} />
            <input
              id="search-query"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="contoh: kopi hemat"
            />
          </div>

          <div className="filter-grid">
            <label>
              <span>Kategori</span>
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value as CategoryFilter)}
              >
                {CATEGORY_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </label>

            <label>
              <span>Maks. jalan</span>
              <select
                value={maxMinutes}
                onChange={(event) => setMaxMinutes(Number(event.target.value))}
              >
                <option value={5}>5 menit</option>
                <option value={8}>8 menit</option>
                <option value={10}>10 menit</option>
              </select>
            </label>
          </div>

          <label className="toggle-row">
            <input
              type="checkbox"
              checked={openOnly}
              onChange={(event) => setOpenOnly(event.target.checked)}
            />
            <span>Hanya yang buka sekarang</span>
          </label>

          <div className="section-divider" />

          <div className="results-header">
            <div>
              <span className="eyebrow">Hasil pilot</span>
              <strong>{merchants.length} lokasi</strong>
            </div>
            <span className="source-stamp">Demo GETRA</span>
          </div>

          <div className="result-list">
            {merchants.length === 0 ? (
              <div className="empty-state">
                Tidak ada data demo yang cocok. Lebarkan walking time atau ubah filter.
              </div>
            ) : (
              merchants.map((merchant, index) => (
                <button
                  key={merchant.id}
                  className={
                    merchant.id === selectedMerchant?.id
                      ? "result-row result-row--selected"
                      : "result-row"
                  }
                  onClick={() => handleSelect(merchant)}
                >
                  <span className="result-rank">{index + 1}</span>
                  <span className="result-main">
                    <strong>{merchant.name}</strong>
                    <span>{merchant.category} · {merchant.priceLabel}</span>
                    <span className="result-meta">
                      <Footprints size={13} /> {merchant.walkingMinutes} menit
                      <span>·</span>
                      {merchant.distanceMeters} m
                    </span>
                  </span>
                  <span className="score-box">
                    <strong>{merchant.accessibilityScore}</strong>
                    <span>akses</span>
                  </span>
                </button>
              ))
            )}
          </div>

          <div className="ai-teaser">
            <Bot size={17} />
            <div>
              <strong>AI belum diaktifkan pada milestone ini</strong>
              <span>Fondasi peta dibuat stabil dulu. Endpoint AI lama bisa disambungkan setelah ini.</span>
            </div>
          </div>
        </aside>

        <section className="map-panel" aria-label="Peta GETRA">
          <GetraMap
            merchants={merchants}
            selectedId={selectedMerchant?.id ?? null}
            onSelect={handleSelect}
          />
        </section>

        <aside className="right-panel panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">Evidence</span>
              <h2>Detail lokasi</h2>
            </div>
            <Database size={20} />
          </div>

          {selectedMerchant ? (
            <>
              <div className="detail-title">
                <span className="source-stamp source-stamp--warning">Synthetic</span>
                <h3>{selectedMerchant.name}</h3>
                <p>{selectedMerchant.category} · {selectedMerchant.priceLabel}</p>
              </div>

              <div className="metric-grid">
                <div className="metric">
                  <Footprints size={18} />
                  <span>Walking time</span>
                  <strong>{selectedMerchant.walkingMinutes} menit</strong>
                </div>
                <div className="metric">
                  <MapPinned size={18} />
                  <span>Distance</span>
                  <strong>{selectedMerchant.distanceMeters} m</strong>
                </div>
                <div className="metric">
                  <Layers3 size={18} />
                  <span>Accessibility</span>
                  <strong>{selectedMerchant.accessibilityScore}/100</strong>
                </div>
                <div className="metric">
                  <Clock3 size={18} />
                  <span>Status</span>
                  <strong>{selectedMerchant.openNow ? "Buka*" : "Tutup*"}</strong>
                </div>
              </div>

              <section className="evidence-section">
                <h4>Provenance</h4>
                <dl className="evidence-list">
                  <div>
                    <dt>Sumber</dt>
                    <dd>{selectedMerchant.source}</dd>
                  </div>
                  <div>
                    <dt>Status</dt>
                    <dd>{selectedMerchant.status}</dd>
                  </div>
                  <div>
                    <dt>Waktu</dt>
                    <dd>{selectedMerchant.updatedAt}</dd>
                  </div>
                  <div>
                    <dt>Metode</dt>
                    <dd>Nilai demo; belum pedestrian network</dd>
                  </div>
                </dl>
              </section>

              <section className="evidence-section">
                <h4>Limitation</h4>
                <p className="limitation-box">{selectedMerchant.limitation}</p>
              </section>

              <section className="evidence-section">
                <h4>Target tahap berikutnya</h4>
                <ol className="next-list">
                  <li>Ganti merchant synthetic dengan Supabase.</li>
                  <li>Hitung walking time melalui pedestrian network.</li>
                  <li>Masukkan Community Activity / Menu Go sebagai evidence.</li>
                  <li>Sambungkan AI untuk parsing intent dan explanation.</li>
                </ol>
              </section>
            </>
          ) : (
            <div className="empty-state">Pilih satu lokasi pada peta atau daftar hasil.</div>
          )}
        </aside>
      </section>
    </main>
  );
}
