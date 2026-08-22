"use client";

import { useCallback, useMemo, useState } from "react";
import {
  Bot,
  CalendarDays,
  Coffee,
  Database,
  Layers3,
  LogOut,
  LocateFixed,
  MapPinned,
  Phone,
  Search,
  ShieldCheck,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { GetraMap } from "@/components/getra-map";
import {
  COFFEE_SHOP_BRANDS,
  COFFEE_SHOP_ORIGIN,
  COFFEE_SHOP_SOURCE_NAME,
  COFFEE_SHOPS,
} from "@/data/coffee-shops-jakarta-barat";
import { authenticatedFetch, clearAuthSession } from "@/src/lib/auth-client";
import type { Merchant, UserLocation } from "@/types/getra";

const BRAND_OPTIONS = [
  "Semua",
  ...COFFEE_SHOP_BRANDS,
] as const;

type BrandFilter =
  (typeof BRAND_OPTIONS)[number];

type LocatedMerchant =
  Merchant & {
    userDistanceMeters?: number;
    userWalkingMinutes?: number;
  };

function distanceMeters(
  a: {
    latitude: number;
    longitude: number;
  },
  b: {
    latitude: number;
    longitude: number;
  },
) {
  const earthRadiusMeters =
    6371008.8;

  const toRad =
    (value: number) =>
      (value * Math.PI) /
      180;

  const dLat =
    toRad(
      b.latitude -
        a.latitude,
    );

  const dLng =
    toRad(
      b.longitude -
        a.longitude,
    );

  const lat1 =
    toRad(
      a.latitude,
    );

  const lat2 =
    toRad(
      b.latitude,
    );

  const h =
    Math.sin(
      dLat / 2,
    ) ** 2 +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(
        dLng / 2,
      ) ** 2;

  return Math.round(
    earthRadiusMeters *
      2 *
      Math.atan2(
        Math.sqrt(h),
        Math.sqrt(
          1 - h,
        ),
      ),
  );
}

function formatDistance(
  meters: number,
) {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)} km`;
  }

  return `${meters} m`;
}

export function GetraDashboard() {
  const router =
    useRouter();

  const [
    query,
    setQuery,
  ] =
    useState("");

  const [
    brand,
    setBrand,
  ] =
    useState<BrandFilter>(
      "Semua",
    );

  const [
    openOnly,
    setOpenOnly,
  ] =
    useState(true);

  const [
    loggingOut,
    setLoggingOut,
  ] =
    useState(false);

  const [
    locating,
    setLocating,
  ] =
    useState(false);

  const [
    locationError,
    setLocationError,
  ] =
    useState<string | null>(
      null,
    );

  const [
    userLocation,
    setUserLocation,
  ] =
    useState<UserLocation | null>(
      null,
    );

  const [
    selectedId,
    setSelectedId,
  ] =
    useState<string | null>(
      COFFEE_SHOPS[0]?.id ??
        null,
    );

  const merchants =
    useMemo(() => {
      const normalizedQuery =
        query
          .trim()
          .toLowerCase();

      const filtered =
        COFFEE_SHOPS
        .filter((merchant) => {
          if (
            brand !==
              "Semua" &&
            merchant.brand !==
              brand
          ) {
            return false;
          }

          if (
            openOnly &&
            !merchant.openNow
          ) {
            return false;
          }

          if (
            normalizedQuery &&
            !`${merchant.name} ${merchant.brand} ${merchant.address ?? ""} ${merchant.district ?? ""} ${merchant.village ?? ""}`
              .toLowerCase()
              .includes(
                normalizedQuery,
              )
          ) {
            return false;
          }

          return true;
        });

      const withDistance: LocatedMerchant[] =
        userLocation
          ? filtered.map(
              (
                merchant,
              ) => {
                const userDistanceMeters =
                  distanceMeters(
                    userLocation,
                    merchant,
                  );

                return {
                  ...merchant,
                  userDistanceMeters,
                  userWalkingMinutes:
                    Math.max(
                      1,
                      Math.round(
                        userDistanceMeters /
                          80,
                      ),
                    ),
                };
              },
            )
          : filtered;

      return withDistance.sort(
        (
          a,
          b,
        ) => {
          if (
            userLocation &&
            a.userDistanceMeters !==
              undefined &&
            b.userDistanceMeters !==
              undefined &&
            a.userDistanceMeters !==
              b.userDistanceMeters
          ) {
            return (
              a.userDistanceMeters -
              b.userDistanceMeters
            );
          }

          return (
            a.name.localeCompare(
              b.name,
              "id",
            ) ||
            a.longitude -
              b.longitude ||
            a.latitude -
              b.latitude
          );
        },
      );
    }, [
      brand,
      openOnly,
      query,
      userLocation,
    ]);

  const selectedMerchant =
    merchants.find(
      (merchant) =>
        merchant.id ===
        selectedId,
    ) ??
    merchants[0] ??
    null;

  const handleSelect =
    useCallback(
      (
        merchant: Merchant,
      ) => {
        setSelectedId(
          merchant.id,
        );
      },
      [],
    );

  const handleLocateUser =
    useCallback(() => {
      setLocationError(
        null,
      );

      if (
        !("geolocation" in navigator)
      ) {
        setLocationError(
          "Perangkat atau browser belum mendukung GPS/location.",
        );
        return;
      }

      setLocating(
        true,
      );

      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            latitude:
              position.coords.latitude,
            longitude:
              position.coords.longitude,
            accuracyMeters:
              Math.round(
                position.coords.accuracy,
              ),
            capturedAt:
              new Date().toISOString(),
          });

          setLocating(
            false,
          );
        },
        (error) => {
          const message =
            error.code ===
            error.PERMISSION_DENIED
              ? "Izin lokasi ditolak. Aktifkan permission location di browser untuk memakai GPS."
              : error.code ===
                  error.POSITION_UNAVAILABLE
                ? "Lokasi perangkat belum tersedia. Coba nyalakan GPS/Wi-Fi location lalu ulangi."
                : "Pengambilan lokasi terlalu lama. Coba ulangi dari perangkat.";

          setLocationError(
            message,
          );
          setLocating(
            false,
          );
        },
        {
          enableHighAccuracy: true,
          timeout: 12000,
          maximumAge: 30000,
        },
      );
    }, []);

  const handleLogout =
    useCallback(async () => {
      if (loggingOut) return;

      setLoggingOut(
        true,
      );

      try {
        try {
          await authenticatedFetch(
            `${process.env.NEXT_PUBLIC_API_URL}/api/auth/logout`,
            {
              method:
                "POST",
            },
          );
        } catch {
          // Browser logout must still clear its local session if the API is down.
        }

        await clearAuthSession();
        router.replace(
          "/login",
        );
        router.refresh();
      } catch {
        setLoggingOut(
          false,
        );
      }
    }, [
      loggingOut,
      router,
    ]);

  return (
    <main className="workspace">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">
            G
          </div>
          <div>
            <strong>
              GETRA
            </strong>
            <span>
              Geo-Enabled Transit & Retail Analytics
            </span>
          </div>
        </div>

        <nav
          className="stakeholder-switch"
          aria-label="Mode data"
        >
          <button className="stakeholder-button stakeholder-button--active">
            Coffee
          </button>
          <button className="stakeholder-button" disabled>
            Transit
          </button>
          <button className="stakeholder-button" disabled>
            UMKM
          </button>
          <button className="stakeholder-button" disabled>
            Investor
          </button>
        </nav>

        <div className="topbar-actions">
          <div className="pilot-badge">
            <ShieldCheck size={15} />
            GeoJSON Q2 2026
          </div>

          <button
            className="logout-button"
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
          >
            <LogOut size={15} />
            {loggingOut
              ? "Keluar..."
              : "Keluar"}
          </button>
        </div>
      </header>

      <section className="workspace-grid">
        <aside className="left-panel panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">
                GeoJSON search
              </span>
              <h1>
                Coffee shop Jakarta Barat
              </h1>
            </div>
            <Search size={20} />
          </div>

          <div className="origin-box">
            <MapPinned size={17} />
            <div>
              <span>
                Lokasi pengguna
              </span>
              <strong>
                {userLocation
                  ? `${userLocation.latitude.toFixed(6)}, ${userLocation.longitude.toFixed(6)}`
                  : COFFEE_SHOP_ORIGIN.name}
              </strong>
              {userLocation ? (
                <small>
                  Akurasi GPS sekitar {userLocation.accuracyMeters} m
                </small>
              ) : null}
            </div>
          </div>

          <button
            className="locate-button"
            type="button"
            onClick={handleLocateUser}
            disabled={locating}
          >
            <LocateFixed size={16} />
            {locating
              ? "Mengambil lokasi..."
              : userLocation
                ? "Perbarui lokasi saya"
                : "Gunakan lokasi saya"}
          </button>

          {locationError ? (
            <p className="location-error">
              {locationError}
            </p>
          ) : null}

          <label
            className="field-label"
            htmlFor="search-query"
          >
            Pencarian
          </label>
          <div className="search-box">
            <Search size={17} />
            <input
              id="search-query"
              value={query}
              onChange={(event) =>
                setQuery(
                  event.target.value,
                )
              }
              placeholder="contoh: Starbucks Puri"
            />
          </div>

          <div className="filter-grid filter-grid--single">
            <label>
              <span>
                Brand
              </span>
              <select
                value={brand}
                onChange={(event) =>
                  setBrand(
                    event.target
                      .value as BrandFilter,
                  )
                }
              >
                {BRAND_OPTIONS.map((option) => (
                  <option
                    key={option}
                    value={option}
                  >
                    {option}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="toggle-row">
            <input
              type="checkbox"
              checked={openOnly}
              onChange={(event) =>
                setOpenOnly(
                  event.target
                    .checked,
                )
              }
            />
            <span>
              Hanya status BUKA
            </span>
          </label>

          <div className="section-divider" />

          <div className="results-header">
            <div>
              <span className="eyebrow">
                Hasil GeoJSON
              </span>
              <strong>
                {merchants.length} dari {COFFEE_SHOPS.length} titik
              </strong>
            </div>
            <span className="source-stamp">
              2026
            </span>
          </div>

          <div className="result-list">
            {merchants.length === 0 ? (
              <div className="empty-state">
                Tidak ada titik yang cocok. Ubah brand, kata kunci, atau status buka.
              </div>
            ) : (
              merchants.map(
                (
                  merchant,
                  index,
                ) => (
                  <button
                    key={merchant.id}
                    className={
                      merchant.id ===
                      selectedMerchant?.id
                        ? "result-row result-row--selected"
                        : "result-row"
                    }
                    onClick={() =>
                      handleSelect(
                        merchant,
                      )
                    }
                  >
                    <span className="result-rank">
                      {index + 1}
                    </span>
                    <span className="result-main">
                      <strong>
                        {merchant.name}
                      </strong>
                      <span>
                        {merchant.brand}
                        {" · "}
                        {merchant.district}
                      </span>
                      <span className="result-meta">
                        {merchant.userDistanceMeters !==
                        undefined ? (
                          <>
                            <LocateFixed size={13} />
                            {formatDistance(
                              merchant.userDistanceMeters,
                            )}
                            <span>
                              ·
                            </span>
                            {merchant.userWalkingMinutes} menit
                          </>
                        ) : (
                          <>
                            <MapPinned size={13} />
                            {merchant.latitude.toFixed(
                              6,
                            )}
                            ,
                            {" "}
                            {merchant.longitude.toFixed(
                              6,
                            )}
                          </>
                        )}
                      </span>
                    </span>
                    <span className="score-box">
                      <strong>
                        {merchant.openNow
                          ? "BUKA"
                          : "TUTUP"}
                      </strong>
                      <span>
                        status
                      </span>
                    </span>
                  </button>
                ),
              )
            )}
          </div>

          <div className="ai-teaser">
            <Bot size={17} />
            <div>
              <strong>
                Data sudah memakai GeoJSON lokal
              </strong>
              <span>
                Aktifkan lokasi perangkat agar daftar diurutkan dari titik kamu saat ini.
              </span>
            </div>
          </div>
        </aside>

        <section
          className="map-panel"
          aria-label="Peta GETRA"
        >
          <GetraMap
            merchants={merchants}
            selectedId={selectedId}
            userLocation={userLocation}
            onSelect={handleSelect}
          />
        </section>

        <aside className="right-panel panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">
                Evidence
              </span>
              <h2>
                Detail lokasi
              </h2>
            </div>
            <Database size={20} />
          </div>

          {selectedMerchant ? (
            <>
              <div className="detail-title">
                <span className="source-stamp source-stamp--warning">
                  GeoJSON
                </span>
                <h3>
                  {selectedMerchant.name}
                </h3>
                <p>
                  {selectedMerchant.brand}
                  {" · "}
                  {selectedMerchant.category}
                </p>
              </div>

              <div className="metric-grid">
                <div className="metric">
                  <Coffee size={18} />
                  <span>
                    Brand
                  </span>
                  <strong>
                    {selectedMerchant.brand}
                  </strong>
                </div>
                <div className="metric">
                  <MapPinned size={18} />
                  <span>
                    Kecamatan
                  </span>
                  <strong>
                    {selectedMerchant.district ||
                      "-"}
                  </strong>
                </div>
                <div className="metric">
                  <Layers3 size={18} />
                  <span>
                    Dari lokasi kamu
                  </span>
                  <strong>
                    {selectedMerchant.userDistanceMeters !==
                    undefined
                      ? `${formatDistance(selectedMerchant.userDistanceMeters)} · ${selectedMerchant.userWalkingMinutes} menit`
                      : "Aktifkan GPS"}
                  </strong>
                </div>
                <div className="metric">
                  <CalendarDays size={18} />
                  <span>
                    Status
                  </span>
                  <strong>
                    {selectedMerchant.openNow
                      ? "BUKA"
                      : "TUTUP"}
                  </strong>
                </div>
              </div>

              <section className="evidence-section">
                <h4>
                  Alamat
                </h4>
                <p className="limitation-box">
                  {selectedMerchant.address ||
                    "Alamat tidak tersedia pada GeoJSON."}
                </p>
              </section>

              <section className="evidence-section">
                <h4>
                  Provenance
                </h4>
                <dl className="evidence-list">
                  <div>
                    <dt>
                      Sumber
                    </dt>
                    <dd>
                      {COFFEE_SHOP_SOURCE_NAME}
                    </dd>
                  </div>
                  <div>
                    <dt>
                      Desa
                    </dt>
                    <dd>
                      {selectedMerchant.village ||
                        "-"}
                    </dd>
                  </div>
                  <div>
                    <dt>
                      Telepon
                    </dt>
                    <dd>
                      {selectedMerchant.phone ? (
                        <span className="inline-icon-value">
                          <Phone size={12} />
                          {selectedMerchant.phone}
                        </span>
                      ) : (
                        "-"
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt>
                      Koordinat
                    </dt>
                    <dd>
                      {selectedMerchant.latitude.toFixed(6)}, {selectedMerchant.longitude.toFixed(6)}
                    </dd>
                  </div>
                  <div>
                    <dt>
                      Update
                    </dt>
                    <dd>
                      {selectedMerchant.updatedAt}
                    </dd>
                  </div>
                </dl>
              </section>

              <section className="evidence-section">
                <h4>
                  Catatan
                </h4>
                <p className="limitation-box">
                  {selectedMerchant.limitation}
                </p>
              </section>
            </>
          ) : (
            <div className="empty-state">
              Pilih satu titik pada peta atau daftar hasil.
            </div>
          )}
        </aside>
      </section>
    </main>
  );
}
