# Kontrak API

Dibuat 2026-09-21T03:54:06.357Z. Kandidat kode: `ee65dbf027308417a206e9c65c402becf3b502ac`. Branch: `fix/production-hardening-20260920`. Status penerimaan keseluruhan: **NOT_READY**. Build: **PASS**.

Frontend: https://getra-routing-api.tail0ed517.ts.net:8443

Login: https://getra-routing-api.tail0ed517.ts.net:8443/login

Backend health: https://getra-routing-api.tail0ed517.ts.net/api/health

URL ini tetap dipertahankan. Laporan membedakan kandidat dari deployment publik.

## GET /api/international/:layer

Layer: weather, earthquakes, active-fire, air-quality, places, elevation, timezone, poi, accessibility, water-refill, bikeshare, micromobility, ev-charging, transit-stops, jakarta-transit, flood, disaster, weather-radar, weather-satellite, open-data.

lat/lon wajib numerik WGS84; radius meter. Filter menurut layer: q, category, magnitude, adm4, system, source, year, points, since, until. Contoh: /api/international/earthquakes?lat=-6.2&lon=106.82&radius=20000000&magnitude=2.

Respons: layer, status, message, source, fetched_at, last_updated, ttl, data FeatureCollection, warnings, truncated, quality, cache_status. imagery dan systems bersifat opsional. Jangan menyamakan record inventaris, prakiraan, kontur dan pengukuran realtime.

GET /api/international/sources tidak membutuhkan koordinat. Endpoint sengaja publik untuk data publik, dengan CORS allowlist dan rate limit spatial bersama. x-request-id dipropagasi, cache HTTP no-store; cache provider internal tetap TTL.

## POST /api/international/interpret

application/json: {"layer":"weather","query":{"lat":-6.2,"lon":106.82,"radius":1000}}. Maksimum body 16.000 byte, termasuk stream tanpa content-length. Respons answer/source/status/generated_by. Interpretasi deterministik hanya memakai hasil tool.

400: input malformed/koordinat invalid. 404: layer tidak dikenal. 413: body terlalu besar. 429: kuota. Kegagalan upstream dipetakan ke status dataset ERROR/AUTH_REQUIRED/UNAVAILABLE, tanpa mengisi angka dummy.

## Service area dan AI

Service area existing POST /api/spatial/service-area mempertahankan autentikasi dan kontrak envelope. Fallback memberi analysis_method NETWORK_ISOCHRONE, source VALHALLA_OSM, MultiLineString, retrieved_at dan limitation flags. reachable_edge_count/reachable_node_count null bila tidak dihitung.

/api/ai/ask menerima question, active_experience, context. Intent router merencanakan tool; hasil backend/GIS tetap otoritatif. Tidak ada tindakan admin otomatis dari kalimat pengguna.

## Bukti kontrak

180 kasus shared provider boundary (20 layer × 9 kondisi) memakai adapter mock: 401/403/404/429/500, timeout, malformed, empty, stale. Tes normalisasi provider terpisah memakai fixture terbatas. Ini belum memenuhi matriks payload penuh semua adapter; smoke real-data memakai HTTP sumber sebenarnya.
