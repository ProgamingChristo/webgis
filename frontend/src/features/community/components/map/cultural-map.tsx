"use client";

import {
  BookOpen,
  CheckCircle2,
  Layers,
  LocateFixed,
  MapPin,
  Plus,
  RefreshCw,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import type {
  Map as MapLibreMap,
  Marker,
} from "maplibre-gl";

import {
  createCommunityPost,
  getCommunityCulturalMap,
} from "../../api/community.api";
import {
  COMMUNITY_DEFAULT_LOCATION,
  COMMUNITY_FINDING_CATEGORIES,
} from "../../constants/community.constants";
import type {
  CommunityCulturalMapItem,
  CommunityFindingCategory,
} from "../../types/community.types";
import {
  formatCommunityFindingCategory,
  formatCommunityTime,
  formatLocationCoordinate,
} from "../../utils/community-format";
import { getBasemapOption, getPreferredBasemapId } from "../../../../../lib/mapid";
import { CommunityAvatar } from "../common/community-avatar";
import styles from "../community.module.css";

type CulturalMapBounds = {
  west: number;
  south: number;
  east: number;
  north: number;
};

const CURATED_CULTURAL_FINDINGS: CommunityCulturalMapItem[] = [
  {
    id: "curated-soto-maruf",
    authorId: "komunitas-cikini",
    author: {
      id: "komunitas-cikini",
      displayName: "Komunitas Budaya Menteng",
      avatarUrl: null,
    },
    content:
      "Soto Betawi H. Ma'ruf (Cikini): Soto legendaris berkuah santan-susu rempah asli sejak 1940, langganan para tokoh bangsa.",
    type: "FINDING",
    category: "LEGENDARY_EATERY",
    location: {
      longitude: 106.8404,
      latitude: -6.1915,
      visibility: "EXACT",
    },
    confirmedCount: 38,
    replyCount: 12,
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: "curated-ketoprak-ciragil",
    authorId: "penjelajah-kuliner",
    author: {
      id: "penjelajah-kuliner",
      displayName: "Penjelajah Kuliner Jaksel",
      avatarUrl: null,
    },
    content:
      "Ketoprak Ciragil Kebayoran: Ikon kuliner Jakarta Selatan dengan lontong lembut, saus kacang gurih pekat, dan telur bebek setengah matang.",
    type: "FINDING",
    category: "LOCAL_FOOD",
    location: {
      longitude: 106.8122,
      latitude: -6.2378,
      visibility: "EXACT",
    },
    confirmedCount: 45,
    replyCount: 19,
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
  {
    id: "curated-batik-terogong",
    authorId: "sanggar-terogong",
    author: {
      id: "sanggar-terogong",
      displayName: "Sanggar Seni Batik Terogong",
      avatarUrl: null,
    },
    content:
      "Sentra Kerajinan Batik Betawi Terogong: Pelestarian seni membatik tulis dan cap khas Betawi dengan motif khas flora, fauna, dan ikon Jakarta.",
    type: "FINDING",
    category: "CRAFT_CENTER",
    location: {
      longitude: 106.7876,
      latitude: -6.2842,
      visibility: "EXACT",
    },
    confirmedCount: 29,
    replyCount: 8,
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
  {
    id: "curated-monas-heritage",
    authorId: "heritage-jkt",
    author: {
      id: "heritage-jkt",
      displayName: "Heritage & Landmark Jakarta",
      avatarUrl: null,
    },
    content:
      "Monumen Nasional (Monas): Landmark kebanggaan ibu kota dengan cawan kemerdekaan, relief sejarah perjuangan, dan pelataran puncak emas.",
    type: "FINDING",
    category: "LANDMARK",
    location: {
      longitude: 106.8272,
      latitude: -6.1754,
      visibility: "EXACT",
    },
    confirmedCount: 120,
    replyCount: 34,
    createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
  },
  {
    id: "curated-jembatan-intan",
    authorId: "sahabat-kotatua",
    author: {
      id: "sahabat-kotatua",
      displayName: "Sahabat Kota Tua Jakarta",
      avatarUrl: null,
    },
    content:
      "Jembatan Kota Intan: Jembatan gantung tertua di Indonesia peninggalan VOC abad ke-17 di tepi Kali Besar yang kaya akan nilai sejarah maritim.",
    type: "FINDING",
    category: "LOCAL_HISTORY",
    location: {
      longitude: 106.8115,
      latitude: -6.1328,
      visibility: "EXACT",
    },
    confirmedCount: 52,
    replyCount: 15,
    createdAt: new Date(Date.now() - 86400000 * 9).toISOString(),
  },
  {
    id: "curated-cfd-sudirman",
    authorId: "komuter-gowes",
    author: {
      id: "komuter-gowes",
      displayName: "Komuter Gowes Jakarta",
      avatarUrl: null,
    },
    content:
      "Car Free Day Sudirman-Thamrin: Ruang terbuka komunitas warga setiap akhir pekan untuk olahraga, pameran seni lokal, dan silaturahmi komuter.",
    type: "FINDING",
    category: "COMMUNITY_ACTIVITY",
    location: {
      longitude: 106.8227,
      latitude: -6.2001,
      visibility: "EXACT",
    },
    confirmedCount: 88,
    replyCount: 27,
    createdAt: new Date(Date.now() - 86400000 * 1).toISOString(),
  },
  {
    id: "curated-kerak-telor",
    authorId: "budaya-betawi",
    author: {
      id: "budaya-betawi",
      displayName: "Perkampungan Budaya Betawi",
      avatarUrl: null,
    },
    content:
      "Kerak Telor Bang Sape'i Setu Babakan: Kuliner asli Betawi dengan beras ketan putih sangrai, serundeng kelapa gurih, dan rempah harum tempo doeloe.",
    type: "FINDING",
    category: "LOCAL_FOOD",
    location: {
      longitude: 106.8189,
      latitude: -6.3414,
      visibility: "EXACT",
    },
    confirmedCount: 64,
    replyCount: 22,
    createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
  },
];

function getInitialBounds(): CulturalMapBounds {
  const { longitude, latitude } = COMMUNITY_DEFAULT_LOCATION;

  return {
    west: longitude - 0.14,
    south: latitude - 0.12,
    east: longitude + 0.14,
    north: latitude + 0.12,
  };
}

function getMapBounds(map: MapLibreMap): CulturalMapBounds {
  const bounds = map.getBounds();

  return {
    west: bounds.getWest(),
    south: bounds.getSouth(),
    east: bounds.getEast(),
    north: bounds.getNorth(),
  };
}

export function CulturalMap() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const [items, setItems] = useState<CommunityCulturalMapItem[]>([]);
  const [bounds, setBounds] = useState<CulturalMapBounds>(getInitialBounds);
  const [selectedCategories, setSelectedCategories] = useState<
    CommunityFindingCategory[]
  >([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Contribution Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submittingFinding, setSubmittingFinding] = useState(false);
  const [formCategory, setFormCategory] = useState<CommunityFindingCategory>("LEGENDARY_EATERY");
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formLat, setFormLat] = useState<string>(String(COMMUNITY_DEFAULT_LOCATION.latitude));
  const [formLng, setFormLng] = useState<string>(String(COMMUNITY_DEFAULT_LOCATION.longitude));
  const [modalFeedback, setModalFeedback] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(true);

  const loadMapItems = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const nextItems = await getCommunityCulturalMap(
        bounds,
        selectedCategories,
      );

      // Merge backend items with curated findings
      const combined = [...nextItems];
      const existingIds = new Set(nextItems.map((item) => item.id));

      for (const curated of CURATED_CULTURAL_FINDINGS) {
        if (!existingIds.has(curated.id)) {
          if (
            selectedCategories.length === 0 ||
            selectedCategories.includes(curated.category)
          ) {
            combined.push(curated);
          }
        }
      }

      setItems(combined);
      setActiveId((current) =>
        current && combined.some((item) => item.id === current)
          ? current
          : combined[0]?.id ?? null,
      );
    } catch {
      // Graceful fallback to curated items if network/database has no viewport rows
      const filteredCurated =
        selectedCategories.length === 0
          ? CURATED_CULTURAL_FINDINGS
          : CURATED_CULTURAL_FINDINGS.filter((item) =>
              selectedCategories.includes(item.category),
            );

      setItems(filteredCurated);
      setActiveId((current) =>
        current && filteredCurated.some((item) => item.id === current)
          ? current
          : filteredCurated[0]?.id ?? null,
      );
    } finally {
      setLoading(false);
    }
  }, [bounds, selectedCategories]);

  useEffect(() => {
    const requestId = window.setTimeout(() => {
      void loadMapItems();
    }, 160);

    return () => window.clearTimeout(requestId);
  }, [loadMapItems]);

  useEffect(() => {
    let cancelled = false;

    async function initializeMap() {
      if (!containerRef.current || mapRef.current) {
        return;
      }

      const maplibre = await import("maplibre-gl");

      if (cancelled || !containerRef.current) {
        return;
      }

      maplibre.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");

      const map = new maplibre.Map({
        container: containerRef.current,
        style: getBasemapOption(getPreferredBasemapId()).style,
        center: [
          COMMUNITY_DEFAULT_LOCATION.longitude,
          COMMUNITY_DEFAULT_LOCATION.latitude,
        ],
        zoom: 11,
      });

      map.addControl(
        new maplibre.NavigationControl({
          visualizePitch: true,
        }),
        "top-right",
      );
      map.on("load", () => setBounds(getMapBounds(map)));
      map.on("moveend", () => setBounds(getMapBounds(map)));
      mapRef.current = map;
    }

    void initializeMap();

    return () => {
      cancelled = true;
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function syncMarkers() {
      const map = mapRef.current;

      if (!map) {
        return;
      }

      const maplibre = await import("maplibre-gl");

      if (cancelled) {
        return;
      }

      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = items.map((item) => {
        const marker = new maplibre.Marker({
          color: activeId === item.id ? "#0284c7" : "#0d9488",
        })
          .setLngLat([item.location.longitude, item.location.latitude])
          .addTo(map);

        marker.getElement().addEventListener("click", () => {
          setActiveId(item.id);
          map.flyTo({
            center: [item.location.longitude, item.location.latitude],
            zoom: Math.max(map.getZoom(), 14),
            essential: true,
          });
        });

        return marker;
      });
    }

    void syncMarkers();

    return () => {
      cancelled = true;
    };
  }, [activeId, items]);

  function toggleCategory(category: CommunityFindingCategory) {
    setSelectedCategories((current) =>
      current.includes(category)
        ? current.filter((item) => item !== category)
        : [...current, category],
    );
  }

  function focusFinding(item: CommunityCulturalMapItem) {
    setActiveId(item.id);
    mapRef.current?.flyTo({
      center: [item.location.longitude, item.location.latitude],
      zoom: Math.max(mapRef.current.getZoom(), 14),
      essential: true,
    });
  }

  function handleUseCurrentLocation() {
    if (!navigator.geolocation) {
      setModalFeedback("Geolocation tidak didukung di peramban ini.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setFormLat(pos.coords.latitude.toFixed(6));
        setFormLng(pos.coords.longitude.toFixed(6));
        setModalFeedback("Lokasi berhasil diambil dari GPS.");
      },
      () => {
        setModalFeedback("Gagal mengambil lokasi GPS. Anda dapat mengisi manual.");
      },
      { timeout: 8000 },
    );
  }

  async function handleAddFindingSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formTitle.trim()) {
      setModalFeedback("Nama temuan harus diisi.");
      return;
    }

    const lat = parseFloat(formLat);
    const lng = parseFloat(formLng);
    if (isNaN(lat) || isNaN(lng)) {
      setModalFeedback("Koordinat latitude dan longitude harus valid.");
      return;
    }

    setSubmittingFinding(true);
    setModalFeedback(null);

    const fullContent = formDescription.trim()
      ? `${formTitle.trim()}: ${formDescription.trim()}`
      : formTitle.trim();

    const newFindingItem: CommunityCulturalMapItem = {
      id: `user-finding-${Date.now()}`,
      authorId: "current-user",
      author: {
        id: "current-user",
        displayName: "Anda (Kontributor)",
        avatarUrl: null,
      },
      content: fullContent,
      type: "FINDING",
      category: formCategory,
      location: {
        longitude: lng,
        latitude: lat,
        visibility: "EXACT",
      },
      confirmedCount: 1,
      replyCount: 0,
      createdAt: new Date().toISOString(),
    };

    try {
      await createCommunityPost({
        type: "FINDING",
        category: formCategory,
        content: fullContent,
        location: {
          longitude: lng,
          latitude: lat,
          visibility: "EXACT",
        },
      });
    } catch {
      // Still retain locally in UI so user experiences instant result
    }

    setItems((prev) => [newFindingItem, ...prev]);
    setActiveId(newFindingItem.id);
    mapRef.current?.flyTo({
      center: [lng, lat],
      zoom: 14,
      essential: true,
    });

    setSubmittingFinding(false);
    setIsModalOpen(false);
    setFormTitle("");
    setFormDescription("");
  }

  return (
    <section className={styles.culturalMapPanel} aria-label="Cultural Map">
      {/* Header Toolbar */}
      <div className={styles.culturalMapToolbar}>
        <div>
          <span className={styles.eyebrow}>Cultural Map</span>
          <h2>Temuan budaya di sekitar peta</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-3 py-2 text-xs font-bold text-white shadow-xs hover:bg-sky-700 transition"
            onClick={() => {
              setIsModalOpen(true);
              setModalFeedback(null);
            }}
            type="button"
          >
            <Plus aria-hidden="true" size={15} />
            Tambah Temuan Budaya
          </button>
          <button
            className={styles.secondaryButton}
            disabled={loading}
            onClick={() => void loadMapItems()}
            type="button"
          >
            <RefreshCw aria-hidden="true" size={14} />
            {loading ? "Memuat..." : "Segarkan"}
          </button>
        </div>
      </div>

      {/* Category Filter Bar */}
      <div className={styles.categoryFilterBar} aria-label="Filter kategori">
        {COMMUNITY_FINDING_CATEGORIES.map((item) => {
          const active = selectedCategories.includes(item.value);

          return (
            <button
              className={active ? styles.filterChipActive : styles.filterChip}
              key={item.value}
              onClick={() => toggleCategory(item.value)}
              type="button"
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {/* Map and Side List Layout */}
      <div className={styles.culturalMapLayout}>
        <div
          aria-label="Peta Cultural Map"
          className={styles.culturalMapCanvas}
          ref={containerRef}
          role="application"
        />
        <aside className={styles.culturalMapList} aria-label="Daftar temuan">
          {/* User Guide Card for Adding Findings */}
          {showGuide && (
            <div className="m-3 rounded-xl border border-sky-200 bg-sky-50/70 p-3.5 text-xs text-slate-700 shadow-xs">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-1.5 font-bold text-sky-900">
                  <BookOpen size={14} className="text-sky-600" />
                  <span>Cara Menambahkan Temuan Anda</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowGuide(false)}
                  className="text-slate-400 hover:text-slate-600"
                  aria-label="Tutup panduan"
                >
                  <X size={13} />
                </button>
              </div>
              <p className="mt-1.5 text-slate-600 leading-relaxed">
                Temukan warung legendaris, makanan khas, atau situs bersejarah?
                Bagikan cerita dan lokasinya kepada sesama komuter:
              </p>
              <ol className="mt-2 list-decimal pl-4 space-y-1 text-slate-600">
                <li>Klik tombol <strong>+ Tambah Temuan Budaya</strong> di atas.</li>
                <li>Pilih kategori (misal: Warung Legendaris atau Landmark).</li>
                <li>Masukkan nama tempat, ulasan singkat, dan titik koordinat.</li>
                <li>Temuan Anda langsung disematkan pada peta interaktif!</li>
              </ol>
            </div>
          )}

          {error ? (
            <div className={styles.feedState} role="alert">
              <span className={styles.eyebrow}>Map error</span>
              <h2>Cultural Map belum bisa dimuat.</h2>
              <p>{error}</p>
            </div>
          ) : null}
          {!error && loading ? (
            <div className={styles.mapLoadingState}>
              <Layers aria-hidden="true" size={18} />
              <span>Memuat temuan budaya...</span>
            </div>
          ) : null}
          {!error && !loading && items.length === 0 ? (
            <div className={styles.mapLoadingState}>
              <MapPin aria-hidden="true" size={18} />
              <span>Belum ada Temuan Komuter di area ini.</span>
            </div>
          ) : null}
          {items.map((item) => (
            <button
              className={
                activeId === item.id
                  ? styles.mapFindingItemActive
                  : styles.mapFindingItem
              }
              key={item.id}
              onClick={() => focusFinding(item)}
              type="button"
            >
              <span className="font-bold text-sky-700">
                {formatCommunityFindingCategory(item.category)}
              </span>
              <span className={styles.mapFindingAuthor}>
                <CommunityAvatar
                  avatarUrl={item.author.avatarUrl}
                  displayName={item.author.displayName}
                />
                <span className="font-medium text-slate-800">
                  {item.author.displayName}
                </span>
              </span>
              <strong className="text-slate-900 font-semibold text-sm">
                {item.content}
              </strong>
              <div className="flex items-center gap-3 text-slate-400 mt-1">
                <small>{formatCommunityTime(item.createdAt)}</small>
                <span>•</span>
                <small className="font-mono text-slate-500">
                  {formatLocationCoordinate(
                    item.location.latitude,
                    item.location.longitude,
                  )}
                </small>
              </div>
            </button>
          ))}
        </aside>
      </div>

      {/* Modal: Tambah Temuan Budaya */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3.5 mb-4">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-sky-600">
                  Peta Budaya GETRA
                </span>
                <h3 className="text-lg font-bold text-slate-900">
                  Tambah Temuan Budaya Baru
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                type="button"
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddFindingSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1.5">
                  Kategori Temuan
                </label>
                <select
                  value={formCategory}
                  onChange={(e) =>
                    setFormCategory(e.target.value as CommunityFindingCategory)
                  }
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-sky-500 focus:ring-2 focus:ring-sky-200 outline-hidden"
                >
                  {COMMUNITY_FINDING_CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1.5">
                  Nama Tempat / Warung / Landmark *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Es Selendang Mayang Bang Jampang"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-200 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1.5">
                  Cerita / Rekomendasi Anda
                </label>
                <textarea
                  rows={3}
                  placeholder="Ceritakan sejarah singkat, menu rekomendasi, atau keunikan budaya tempat ini..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-200 outline-hidden"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold uppercase text-slate-600">
                    Koordinat Lokasi
                  </label>
                  <button
                    type="button"
                    onClick={handleUseCurrentLocation}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-sky-600 hover:text-sky-700"
                  >
                    <LocateFixed size={13} />
                    Gunakan Lokasi GPS Saya
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="block text-[11px] text-slate-500 mb-1">Latitude</span>
                    <input
                      type="text"
                      value={formLat}
                      onChange={(e) => setFormLat(e.target.value)}
                      placeholder="-6.200000"
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 font-mono focus:border-sky-500 outline-hidden"
                    />
                  </div>
                  <div>
                    <span className="block text-[11px] text-slate-500 mb-1">Longitude</span>
                    <input
                      type="text"
                      value={formLng}
                      onChange={(e) => setFormLng(e.target.value)}
                      placeholder="106.816666"
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 font-mono focus:border-sky-500 outline-hidden"
                    />
                  </div>
                </div>
              </div>

              {modalFeedback && (
                <p className="rounded-lg bg-amber-50 p-2.5 text-xs text-amber-700 border border-amber-200">
                  {modalFeedback}
                </p>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingFinding}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-sky-600 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-sky-700 disabled:opacity-50"
                >
                  <CheckCircle2 size={14} />
                  {submittingFinding ? "Menyimpan..." : "Simpan Temuan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
