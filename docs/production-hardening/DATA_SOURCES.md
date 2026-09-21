# Sumber data dan mutu

Dibuat 2026-09-21T03:54:06.357Z. Kandidat kode: `ee65dbf027308417a206e9c65c402becf3b502ac`. Branch: `fix/production-hardening-20260920`. Status penerimaan keseluruhan: **NOT_READY**. Build: **PASS**.

Frontend: https://getra-routing-api.tail0ed517.ts.net:8443

Login: https://getra-routing-api.tail0ed517.ts.net:8443/login

Backend health: https://getra-routing-api.tail0ed517.ts.net/api/health

URL ini tetap dipertahankan. Laporan membedakan kandidat dari deployment publik.

## Hasil permintaan sumber nyata

Base pengujian: http://localhost:3100. Mulai: 2026-09-21T03:42:11.627Z; selesai: 2026-09-21T03:44:17.523Z. HTTP 200 dapat membawa AUTH_REQUIRED/UNAVAILABLE/ERROR dan tidak berarti data tersedia. API LIVE berarti respons sumber memenuhi jalur normalisasi; UI menampilkannya sebagai data sumber dimuat. Prakiraan dan inventory bukan sensor live.

| Layer | Sumber | Status API | Record | Latensi |
|---|---|---|---:|---:|
| weather | Open-Meteo | LIVE | 1 | 73 ms |
| weather (BMKG) | BMKG | LIVE | 1 | 219 ms |
| earthquakes | USGS | LIVE | 78 | 782 ms |
| active-fire | NASA FIRMS | AUTH_REQUIRED | 0 | 14 ms |
| air-quality | OpenAQ | AUTH_REQUIRED | 0 | 14 ms |
| places | GeoNames | AUTH_REQUIRED | 0 | 14 ms |
| elevation | GeoNames | AUTH_REQUIRED | 0 | 12 ms |
| timezone | GeoNames | AUTH_REQUIRED | 0 | 12 ms |
| poi | OpenStreetMap contributors | LIVE | 70 | 4356 ms |
| accessibility | OpenStreetMap contributors | ERROR | 0 | 29322 ms |
| water-refill | OpenStreetMap contributors | LIVE | 2 | 4995 ms |
| bikeshare | MobilityData / GBFS operators | LIVE | 1768 | 5033 ms |
| micromobility | MobilityData / GBFS operators | LIVE | 3000 | 2662 ms |
| ev-charging | OpenStreetMap contributors | LIVE | 11 | 3341 ms |
| transit-stops | OpenStreetMap contributors | ERROR | 0 | 32985 ms |
| jakarta-transit | Jakarta Satu / DKI Jakarta | LIVE | 4 | 10979 ms |
| flood | Pemprov DKI Jakarta / DSDA | UNAVAILABLE | 0 | 17 ms |
| disaster | BPBD DKI Jakarta | UNAVAILABLE | 0 | 11 ms |
| weather-radar | BMKG | ERROR | 0 | 30033 ms |
| weather-satellite | BMKG | UNAVAILABLE | 0 | 13 ms |
| open-data | USGS | LIVE | 77 | 933 ms |

## Konfigurasi operator

NASA_FIRMS_MAP_KEY, OPENAQ_API_KEY dan GEONAMES_USERNAME disediakan melalui secret environment backend. Jangan menyimpan nilai di repository, browser atau PDF. CARTO memakai konfigurasi basemap server yang ada. Flood/disaster/satellite memerlukan endpoint resmi dengan skema dan izin yang dapat diverifikasi. URL arbitrary tidak diterima sebagai query pengguna.

Registry /api/international/sources menyertakan provider, dataset, URL, jenis, coverage, license, refresh interval, credential name, status serta last_success/last_failure. Timestamp awal null. Observasi mempunyai name, source, dataset, timestamp, license dan freshness. Timestamp pengambilan tidak menggantikan timestamp observasi.

Validator menolak koordinat di luar WGS84, geometry rusak, field provenance hilang dan timestamp invalid/future di luar toleransi. Quality memuat accepted/rejected, completeness, freshness, timestamp validity; source reliability tetap PROVIDER_REPORTED, bukan skor rekaan. Nol hasil adalah respons kosong, bukan angka sensor nol. STALE tetap dapat dibaca dengan label.

Tidak semua feed menyatakan lisensi redistribusi. Metadata lisensi mengikuti provider dan ketidakjelasannya tetap ditulis.
