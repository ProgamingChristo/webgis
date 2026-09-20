# GETRA: basemap engine dan International Data Center

Tanggal audit: 20 September 2026 (Asia/Jakarta). Ini laporan implementasi dan bukti pengujian, **bukan klaim 100% complete**. Basemap MAPID/OSM/Esri dan sejumlah sumber nyata telah diverifikasi melalui deployment publik. Lima fitur memerlukan kredensial; tiga feed resmi belum terhubung; radar BMKG dan sebagian kueri Overpass mengalami gangguan upstream.

URL referensi produksi yang dipertahankan:

- Frontend: https://getra-routing-api.tail0ed517.ts.net:8443
- Login: https://getra-routing-api.tail0ed517.ts.net:8443/login
- Backend health: https://getra-routing-api.tail0ed517.ts.net/api/health
- Global Data Center: https://getra-routing-api.tail0ed517.ts.net:8443/international/weather

[Panduan penggunaan dan screenshot](international-guide/README.md) · [PDF](international-guide/GETRA_BASEMAP_GLOBAL_DATA_CENTER.pdf)

## A. Basemap fix

### Root cause dan perubahan

- Halaman pemilih basemap sebelumnya tidak mengendalikan instance MapLibre utama secara konsisten. State dan integrasi antarpermukaan peta tidak mempunyai satu kontrak transaksi.
- `setStyle()` menghapus source/layer aplikasi. Pemulihan berbasis timer 150 ms dapat berlangsung sebelum style siap dan menyebabkan layer hilang.
- Fallback OpenFreeMap dapat tampil ketika konfigurasi MAPID tidak tersedia, sehingga tampilan berlabel MAPID tidak membuktikan provider MAPID benar-benar digunakan.
- `frontend/lib/basemap-state.ts` kini menyediakan satu state `basemapId`; `basemap-engine.ts` melakukan transaksi pada instance yang sama: simpan kamera/source/layer, register listener sebelum `setStyle`, pulihkan pada `style.load`, tunggu tile dan `idle`, lalu laporkan READY. Transaksi lama dibatalkan melalui AbortController.
- `rehydrateMapLayers()` memeriksa source/layer yang sudah ada. Callback peta utama memulihkan boundary, contextual layers, dataset extent, route dan service area; revisi style memicu pemulihan marker/icon dan selected popup yang dimiliki aplikasi.
- DOM marker, kontrol, dan state React tidak dihapus saat pergantian basemap. Snapshot terakhir membantu pergantian cepat ketika style belum selesai memulihkan source.
- State LOADING/READY/ERROR/FALLBACK ditampilkan. Kegagalan provider kembali ke MAPID, dengan pesan kegagalan; kredensial yang tidak ada tidak disamarkan sebagai provider berhasil.
- MAPID tetap default pada sesi/tab baru, login/logout, nilai tersimpan tidak valid, serta tombol **Reset ke MAPID**. Reload tab mempertahankan pilihan. Storage key: `getra:basemap:v2`; koordinat tidak dimasukkan ke preferensi basemap.

### Provider

| ID | Endpoint sebenarnya | Hasil |
|---|---|---|
| `mapid-default` | Provider lama `https://basemap.mapid.io`, style konfigurasi `basic` (nama style aktual `Street Mapid`), diproxy `/api/basemap/mapid/styles/default/style.json` | PASS publik; attribution MAPID/OpenMapTiles/OSM |
| `osm` | `https://tile.openstreetmap.org/{z}/{x}/{y}.png` | PASS publik; attribution OSM |
| `carto-light` | `https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png`, proxy server | AUTH_REQUIRED; fallback MAPID PASS |
| `carto-dark` | `https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png`, proxy server | AUTH_REQUIRED; fallback MAPID PASS |
| `esri-satellite` | Endpoint repo yang dipertahankan: `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}` | PASS publik; citra satelit nyata |

CARTO anonim mengembalikan HTTP 200 dengan watermark **API KEY REQUIRED**. Screenshot QA mendeteksinya, sehingga respons tersebut tidak dihitung sebagai sukses. Kebutuhan registrasi didokumentasikan oleh [CARTO](https://carto.com/basemaps/apikey/). Kedua pilihan belum bisa dinyatakan berfungsi tanpa key yang sah.

MAPID mempertahankan host/style yang telah dipakai deployment, dengan key dipindahkan ke server. Semua resource MAPID di JSON style ditulis ulang menjadi URL relatif terhadap origin publik. Ini memperbaiki temuan reverse proxy yang sebelumnya mengeluarkan `0.0.0.0:3000`; frontend sempat di-rollback sebelum perbaikan dipasang dan diuji lagi.

### Bukti acceptance

- Global Data Center: lima perpindahan sukses OSM/Esri/MAPID, kamera center/zoom/bearing/pitch tetap, instance sama, satu titik cuaca nyata tetap terlihat. Dua pilihan CARTO menguji kegagalan dan fallback, **bukan** keberhasilan render CARTO.
- Peta utama: login default MAPID; coordinate handoff dari Data Center menghasilkan rute GIS; pergantian OSM/Esri/MAPID mempertahankan source rute, 107 marker merchant, merchant terpilih dan teks popup yang sama.
- Reload pilihan Esri PASS; viewport 390/820/1440 tidak memiliki horizontal page overflow. Tidak ada uncaught JavaScript error pada kedua rangkaian browser tersebut.
- Tombol Reset ke MAPID pada peta utama diuji langsung. Mobile bottom sheet diuji dalam browser: posisi fixed, sisi bawah tepat pada viewport 844 px; [screenshot sheet](international-guide/screenshots/mobile-sheet.png).
- Logout sesudah memilih OSM mengembalikan `getra:basemap:v2` ke MAPID. Provider cards menunjukkan CONFIGURED/PUBLIC/AUTH_REQUIRED, terpisah dari status transaksi render.
- Active Journey PASS dalam browser dengan GPS pengguna diemulasi untuk QA dan rute dihitung GIS: `journeyOpen=true`, satu route feature tetap terpasang pada OSM/Esri/MAPID, zoom 15.5, pitch 22, posisi dan instance tetap. [Bukti journey](international-guide/evidence/journey-browser.json). Ini bukan uji berkendara fisik atau seluruh mode rerouting.
- Service-area acceptance belum lulus: dua lokasi uji menghasilkan jangkauan belum tersedia dari GIS, sehingga tidak ada geometri nyata yang bisa dipakai untuk membuktikan pemulihan. [Bukti kegagalan](international-guide/evidence/service-area.json); data uji tidak disisipkan ke peta untuk membuatnya tampak lulus.
- Test engine menguji semua lima style definitions, camera restore, rehydration idempotent, error, abort, serta tidak menganggap metadata style sebagai tile siap. Test proxy menguji traversal, missing key, key stripping, dan reverse proxy origin.
- Lihat [bukti browser publik](international-guide/evidence/global-browser.json), [peta utama](international-guide/evidence/main-browser.json), dan bagian E/H. Skenario tambahan dicatat terpisah; kelulusan route tidak berarti semua jenis overlay telah diuji live.

## B. Matriks 20 fitur internasional

Semua route memakai Global Data Center dengan peta, filter, titik/cluster, detail sumber, waktu, TTL, error/no-data, dan pemuatan atas permintaan. Endpoint frontend: `GET /api/international/{slug}`; backend menjalankan adapter dan spatial query. `POST /api/international/interpret` menjalankan ulang tool data menggunakan kueri yang menghasilkan hasil tampilan, termasuk filter, bukan menerima angka pengamatan buatan browser.

Kolom **AI**: `Tool` = interpreter deterministik dari hasil adapter; `Blocked` = menjelaskan sumber/kredensial yang tidak tersedia, tanpa menebak fakta. AI percakapan juga merutekan intent ke adapter; resolusi nama tempat tergantung GeoNames. Kolom **Mobile** `Shared` berarti layout bersama diuji 390/820/1440, bukan setiap kombinasi filter provider diuji di perangkat fisik. Test parser menggunakan fixture terisolasi dalam test; produksi selalu memanggil provider.

Snapshot API publik pertama: 09:33–09:35 WIB. Jumlah hasil berubah mengikuti provider. `LIVE` pada kontrak sumber berarti feed merespons dan belum kedaluwarsa; tidak berarti semua catatan merupakan pengamatan real-time. UI menyebutnya READY/provider responded dan membedakan STATIC/UNKNOWN/STALE per catatan.

| # / Name | Route (`/international/…`) dan API slug | Source / API | Status terverifikasi | Freshness / TTL | GIS | AI | Mobile | Test / batas |
|---|---|---|---|---|---|---|---|---|
| 01 Weather Now | `weather` | Open-Meteo forecast; BMKG prakiraan-cuaca dengan `adm4` | Keduanya menghasilkan 1 titik | 900 s / BMKG 21600 s; model/forecast diberi label | Titik grid provider, forecast detail | Tool | Shared | Public API + marker browser + parser; BMKG bukan sensor saat ini |
| 02 Earthquake | `earthquakes` | USGS `all_day.geojson` | 83 event M2+ pada kueri global | Feed 60 s; waktu kejadian dan pembaruan dipisah | Haversine radius, magnitude, cluster | Tool | Shared | Public API, spatial/magnitude/cache tests |
| 03 Active Fire | `active-fire` | NASA FIRMS VIIRS_SNPP_NRT CSV | PARTIAL: AUTH_REQUIRED | 900 s; acquisition time tiap hotspot | Bbox + radius + cluster contract | Blocked | Shared | Missing-key dan CSV parser PASS; belum authenticated live |
| 04 Air Quality | `air-quality` | OpenAQ v3 locations + latest | PARTIAL: AUTH_REQUIRED | 3600 s; timestamp per sensor | Lokasi sensor/parameter; maksimal 10 lokasi | Blocked | Shared | Missing-key dan sensor join/unit parser PASS |
| 05 Places | `places` | GeoNames searchJSON / findNearbyPlaceNameJSON | PARTIAL: AUTH_REQUIRED | 86400 s; STATIC inventory | Search/nama/region/koordinat, route handoff | Blocked | Shared | Missing-key dan parser PASS; named-place AI belum live |
| 06 Elevation | `elevation` | GeoNames srtm3JSON | PARTIAL: AUTH_REQUIRED | 86400 s; terrain STATIC | Klik koordinat; sampai 20 route samples, jarak geodesik | Blocked | Shared | No-data sentinel/profile parser PASS; belum live |
| 07 Timezone / Sun | `timezone` | GeoNames timezoneJSON | PARTIAL: AUTH_REQUIRED | 3600 s setelah respons; waktu lokal provider | Titik timezone/sunrise/sunset | Blocked | Shared | Missing-key dan timezone parser PASS |
| 08 POI Explorer | `poi` | OSM Overpass | 70 restoran / 1 km pada public test | Snapshot OSM 3600 s; waktu edit per objek STATIC | 15 kategori, radius maksimal 10 km, cluster | Tool | Shared | Public API + parser; Overpass intermittent |
| 09 Accessibility | `accessibility` | OSM tag wheelchair | Public query berhasil, 0 toilet bertag dalam 1 km; percobaan lain timeout | 3600 s; timestamp edit OSM | yes/limited/no hanya jika dipublikasikan | Tool | Shared | Empty/error dan tag contract PASS; tidak menginfer aksesibilitas |
| 10 Drinking Water | `water-refill` | OSM amenity=drinking_water | 2 lokasi pada local live test; public snapshot ERROR timeout | 3600 s | Lokasi/refill/access/hours dari tag | Tool/error | Shared | Parser PASS; konektivitas publik belum stabil |
| 11 Bike Share | `bikeshare` | MobilityData discovery + GBFS operator | Citi Bike `lyft_nyc`: 2520 stasiun nyata | Feed 60 s; last_reported setiap stasiun | Cluster lokasi station; bikes/docks/status | Tool | Shared | Public API + GBFS parser PASS; pricing/geofencing belum |
| 12 Micromobility | `micromobility` | GBFS vehicle_types + vehicle_status/free_bike_status | Dott Berlin: 3000 kendaraan, truncated dinyatakan | Feed 300 s pada operator uji | Titik scooter/moped/cargo; baterai hanya bila ada | Tool | Shared | Public API + GBFS parser PASS; tidak semua format operator |
| 13 EV Charging | `ev-charging` | OSM charging_station | 10 lokasi pada live test 10 km; public snapshot ERROR timeout | 3600 s; inventory STATIC | Connector/operator/access dari tag | Tool/error | Shared | Parser PASS; LOCATION KNOWN, tanpa klaim AVAILABLE NOW |
| 14 Public Transit POI | `transit-stops` | OSM bus/rail/tram/ferry/airport | 50 lokasi / 1 km | 3600 s; inventory STATIC | Cluster, detail, route coordinate handoff | Tool | Shared | Public API + parser PASS; belum GTFS schedules |
| 15 DKI Transport | `jakarta-transit` | Jakarta Satu Transjakarta MapServer/0 | 4 halte / 1 km | 86400 s; update tidak dipublikasikan | ArcGIS spatial query WGS84 | Tool | Shared | Public API + parser PASS; halte, bukan kendaraan live; KRL/bandara belum digabung |
| 16 Flood / Water | `flood` | Kontrak GeoJSON resmi DKI | DATA SOURCE NOT CONNECTED | 300 s setelah feed tersedia | Point observations; status/threshold hanya dari provider | Blocked | Shared | Unavailable + official status preservation tests; belum feed aktual |
| 17 Disaster | `disaster` | Kontrak GeoJSON resmi BPBD DKI | DATA SOURCE NOT CONNECTED | 86400 s | Point incidents; tahun/kategori/waktu | Blocked | Shared | Unavailable contract PASS; belum dataset aktual |
| 18 Weather Radar | `weather-radar` | BMKG official ArcGIS radar mosaic | ERROR: provider HTTP 522 / timeout | 600 s; acquisition time wajib transparan | Export overlay/legend/opacity contract | Blocked | Shared | Projection/extent validation PASS; belum live imagery |
| 19 Satellite Weather | `weather-satellite` | Kontrak manifest BMKG resmi | DATA SOURCE NOT CONNECTED | 600 s | Image bounds/timestamp/legend contract | Blocked | Shared | Missing timestamp rejected; tanpa georeference rekaan |
| 20 Open Data Explorer | `open-data` | Dispatch source adapter yang dipilih | USGS menghasilkan 83 event pada public test | Mengikuti source | Filter lokasi/waktu/dataset, titik/cluster | Tool | Shared | Public API + dispatch/recursion tests; bukan katalog dataset pemerintah lengkap |

## C. Data source matrix

Registry `international_data_sources` mempunyai 13 entri dengan id/name/provider/endpoint/source_type/coverage/requires_key/env_key/license/attribution/refresh_interval/last_success/last_failure/last_verified/status. Metadata saat ini **process-local**, belum tabel database persisten. Restart mereset riwayat probe. `last_verified` diisi setelah adapter berhasil, bukan tanggal palsu saat startup.

| Source ID | Endpoint / dokumentasi primer | Coverage | License / penggunaan | TTL default |
|---|---|---|---|---|
| open-meteo | https://api.open-meteo.com/v1/forecast ; https://open-meteo.com/en/docs | Global | CC BY 4.0; free endpoint non-commercial | 900 s |
| bmkg | https://api.bmkg.go.id/publik/prakiraan-cuaca ; https://data.bmkg.go.id/prakiraan-cuaca/ | Desa Indonesia, adm4 | Attribution BMKG | 21600 s |
| usgs | https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson | Global, past day | US public domain | 60 s |
| firms | https://firms.modaps.eosdis.nasa.gov/api/area/ | Global VIIRS | NASA Earthdata; cite FIRMS | 900 s |
| openaq | https://api.openaq.org/v3/locations ; https://docs.openaq.org/resources/latest | Published stations | Upstream provider licenses | 3600 s |
| geonames | https://secure.geonames.org ; https://www.geonames.org/export/web-services.html | Global | CC BY 4.0 | 86400 s |
| osm | https://overpass-api.de/api/interpreter ; mirror https://overpass.private.coffee/api/interpreter | Global | ODbL 1.0 / OSM attribution | 3600 s |
| gbfs | https://raw.githubusercontent.com/MobilityData/gbfs/master/systems.csv ; https://gbfs.org/get-started/ | Published operators | Operator license_url/license_id, not assumed universal | Operator TTL; catalog 1 day internally |
| dki-transit | https://jakartasatu.jakarta.go.id/server/rest/services/JakartaSatu/Transjakarta/MapServer/0 | DKI | Provider terms; explicit license absent in metadata | 86400 s |
| dki-flood | https://pantaubanjir.jakarta.go.id/ | DKI | Redistribution permission unverified | 300 s |
| dki-disaster | https://bpbd.jakarta.go.id/ ; https://gis-bpbd.jakarta.go.id/open-data-bpbd/ | DKI | Actual dataset license required | 86400 s |
| bmkg-radar | https://dashboard-signature.bmkg.go.id/server/rest/services/Indonesia_radar_latest_v2_tif/MapServer | Indonesia | BMKG attribution/provider terms | 600 s |
| bmkg-satellite | https://satelit.bmkg.go.id/ | Indonesia | BMKG attribution/provider terms | 600 s |

`updated=null` ditampilkan sebagai tidak dipublikasikan, bukan diganti waktu fetch. USGS event time, BMKG analysis/valid time, GBFS last_reported, dan OSM edit/snapshot time tidak dicampur. Cache yang melintasi TTL provider kini berubah STALE walaupun cache fetch belum habis.

## D. API credential matrix

| Environment | Service runtime | Kondisi | Tindakan yang masih dibutuhkan |
|---|---|---|---|
| MAPID_BASEMAP_KEY | Frontend server | Terpasang dari konfigurasi deployment yang sudah ada | Tidak perlu key baru; legacy NEXT_PUBLIC name hanya fallback server untuk migrasi |
| MAPID_STYLE_NAME | Frontend server | `basic`, konfigurasi MAPID existing | Pertahankan style provider |
| CARTO_BASEMAP_API_KEY | Frontend server | Belum tersedia | Key basemap CARTO yang sah; belum diuji authenticated |
| NASA_FIRMS_MAP_KEY | Backend | Belum tersedia | Registrasi FIRMS/key; active-fire AUTH_REQUIRED |
| OPENAQ_API_KEY | Backend | Belum tersedia | OpenAQ v3 key; air-quality AUTH_REQUIRED |
| GEONAMES_USERNAME | Backend | Belum tersedia | Akun GeoNames dengan web services enabled; 3 fitur AUTH_REQUIRED |
| DKI_FLOOD_GEOJSON_URL | Backend | Belum disetel | Feed resmi berizin dengan koordinat, timestamp, dan official status/threshold |
| DKI_DISASTER_GEOJSON_URL | Backend | Belum disetel | Dataset BPBD resmi dan mapping schema aktual |
| BMKG_SATELLITE_MANIFEST_URL | Backend | Belum disetel | Manifest resmi berisi URL, empat koordinat georeference, waktu akuisisi, legend |

Tidak ada key yang ditambahkan ke git, laporan, URL browser, atau kode client. Env lokal MAPID berada dalam file ignored. Runtime VM memakai file server terpisah berizin 0600; compose memuatnya sebagai env_file opsional. Contoh env frontend/root telah diperbarui agar key baru tidak memakai prefix NEXT_PUBLIC.

## E. Responsive dan screenshot QA

| Viewport | Hasil | Bukti |
|---|---|---|
| Mobile 390 × 844 | Scroll width 390; map central, kontrol/data di bawah; tombol basemap membuka bottom sheet | [mobile.png](international-guide/screenshots/mobile.png) |
| Tablet 820 × 1180 | Scroll width 820; dua kolom, detail di bawah | [tablet.png](international-guide/screenshots/tablet.png) |
| Desktop 1440 × 1000 | Scroll width 1440; kontrol–peta–detail | [desktop.png](international-guide/screenshots/desktop.png) |
| MAPID | Style Street Mapid, attribution asli, titik cuaca nyata | [MAPID](international-guide/screenshots/basemap-mapid.png) |
| Esri | Citra satelit nyata, bukan screenshot yang dijadikan basemap | [Esri](international-guide/screenshots/basemap-esri.png) |
| Main map | Rute dan selected merchant saat berpindah provider | [main MAPID](international-guide/screenshots/route-merchant.png) |

Screenshot diperiksa secara visual. Hasil CARTO ber-watermark dari percobaan awal ditolak dan tidak dipakai sebagai bukti sukses. Pengujian viewport memakai Chrome headless pada Windows; bukan sertifikasi seluruh perangkat/browser.

## F. Performance

- Instance MapLibre dipakai ulang saat perubahan basemap. Tidak ada page reload; state kamera/source dipulihkan berdasarkan event, bukan delay tetap.
- Provider hanya dipanggil saat pengguna memuat layer atau meminta tool AI, tidak pada setiap pergerakan peta. Request UI sebelumnya dibatalkan.
- Cache backend per layer+normalized query, TTL provider, maksimum 200 entri; request identik yang sedang berjalan didedup. Cache failure 30 s; hasil sebelumnya boleh dikembalikan STALE saat refresh gagal maksimal 24 jam.
- Overpass radius dibatasi 10 km, hasil 1000, dua endpoint dengan satu fallback terikat timeout. USGS menggunakan feed past-day. OpenAQ maksimal 10 lokasi/100 latest records per lokasi. GBFS/official records maksimum 3000, flag truncated eksplisit.
- Respons upstream maksimum 8 MB; timeout default 30 s per request. Profile elevation maksimal 20 titik. UI list maksimum 100 record; semua record yang diterima tetap masuk source peta.
- Cache/registry/rate-limit belum shared antarprocess. Multi-call GeoNames/GBFS/OpenAQ dapat melebihi satu timeout request secara total. Belum dilakukan load test multiuser atau benchmark frame rate.

## G. Security

- Browser hanya memanggil GETRA BFF untuk provider berkredensial. MAPID style/tile JSON key dihapus, path terbatas, traversal ditolak. CARTO tile path/z/x/y divalidasi dan key disisipkan server.
- Query geographic divalidasi Zod: finite bounded lat/lon/radius, kategori/nama dibatasi, tanggal ISO, rentang waktu berurutan, maksimal 20 profile points. Endpoint URL arbitrer dari pengguna tidak diterima.
- Feed discovery GBFS hanya berasal dari catalog; setiap URL harus HTTPS publik, tanpa userinfo/port khusus/IP literal. DNS private/loopback ditolak; redirect tidak diikuti. Ini mengurangi SSRF, tetapi belum menggunakan DNS pinning/egress proxy untuk perlindungan DNS rebinding penuh.
- Official contract terbatas pada domain pemerintah yang sesuai. JSON upstream diperlakukan sebagai data; React melakukan text escaping, popup memakai text API.
- GET data memiliki rate limit process-local 60/min/IP. POST interpret memiliki batas payload 16 KB, tetapi belum menggunakan rate limiter bersama GET. Forwarded IP harus dipercaya hanya dari reverse proxy yang dikendalikan operator.
- Tidak ada credential pihak ketiga yang ditemukan pada halaman publik lalu diambil untuk dipakai tanpa otorisasi. Feed resmi yang tidak dapat diverifikasi tetap UNAVAILABLE.
- Pemeriksaan publik sesudah deployment akhir membaca 26 script client tanpa kegagalan: key MAPID tidak ditemukan di script/HTML/style; style tidak mengandung internal origin `0.0.0.0`. [Bukti](international-guide/evidence/security.json). Ini pemeriksaan bundle yang dimuat route uji, bukan audit seluruh dependensi.

## H. Build, deploy dan public verification

Base commit lokal/VM: `2c0a59b`. Source release dan dokumentasi dipublikasikan melalui branch `Getra_Deploy` di GitHub. Deployment dilakukan dari snapshot kerja terisolasi `/home/getra/getra-international-20260920`, tidak menimpa source checkout VM lama.

Docker release tag: `2c0a59b-international-20260920`; services `getra-frontend-full` dan `getra-backend-full`, compose project `getra-full-product-10e`. Public frontend menggunakan port HTTPS 8443; backend melalui host yang sama tanpa port tersebut. Release env lama dipertahankan untuk rollback.

| Check | Hasil |
|---|---|
| TypeScript frontend/backend | PASS, eksplisit `tsc --noEmit`; tidak mengandalkan backend build yang mengabaikan typecheck |
| Frontend scoped tests | 78 tests / 5 files PASS, ditambah 5 commuter safety tests PASS |
| Backend international | 54 tests / 2 files PASS (registry, security validation, adapters, credentials, cache, freshness) |
| Existing backend AI regression | 409 tests PASS dalam rangkaian 446 tests sebelum 17 tambahan international |
| Production build | Frontend dan backend PASS; image build pada VM juga PASS |
| Lint | Lint file yang diubah diperiksa; full-repo lint memiliki kegagalan existing di CCTV/SmartMobility yang tidak termasuk perubahan ini |
| Public browser Global Data Center | PASS actual style/point/camera/reload/responsive; 20/20 route HTTP 200 |
| Public browser main map | PASS login default, real route, merchant selection/popup/markers, camera dan source preservation |
| Public provider matrix | Semua 20 adapter diminta; status sumber aktual dan kegagalan dicatat, bukan dinyatakan semua LIVE |
| Public interpretation | HTTP 200, nilai cuaca berasal dari tool Open-Meteo; snapshot awal membantu menemukan bug aging cache yang kemudian diperbaiki |

Rangkaian backend terakhir setelah seluruh perbaikan: **463 tests / 15 files PASS** (409 AI regression + 54 international). Open Data browser juga membuktikan pilihan dataset POI dan kategori pharmacy dikirim sebagai `source=poi&category=pharmacy`, bukan sekadar mengubah label kontrol.

Deployment inti diverifikasi ulang 09:48–09:50 WIB; penyempurnaan status provider/filter Open Data dipasang sesudahnya dan diuji ulang sebelum penyerahan. [Interpretasi akhir](international-guide/evidence/interpretation.json) memakai pengamatan model pukul 09:45 WIB, status CURRENT, berbeda dari snapshot pra-perbaikan yang tetap disimpan sebagai jejak audit. Lint scoped frontend/backend lulus. Kedua container berstatus healthy; checksum **28 file runtime** di VM cocok dengan source lokal, tanpa mismatch. Manifest berada di `outputs/international-audit/release-manifest.json`.

Reproduksi (dari repo root):

```powershell
$env:GETRA_QA_URL='https://getra-routing-api.tail0ed517.ts.net:8443'
$env:GETRA_QA_OUTPUT='outputs/international-audit/public'
node scripts/verify-international-browser.mjs
node scripts/verify-international-api.mjs
node scripts/verify-main-basemap-browser.mjs
node scripts/verify-service-area-basemap.mjs
$env:GETRA_QA_JOURNEY='1'
node scripts/verify-main-basemap-browser.mjs
```

Script main map memakai akun uji biasa yang telah ada pada repo, tidak mencetak password. Browser script memerlukan Chrome di path Windows yang tercantum. Bukti audit utama disalin ke `docs/international-guide/evidence/` dan screenshot ke `docs/international-guide/screenshots/` agar dapat diakses dari GitHub. Artifact kerja tambahan tetap berada di `outputs/` yang ignored.

## I. Known limitations dan pekerjaan yang masih diperlukan

1. **Belum 100% complete.** CARTO dua style belum authenticated; active-fire, air-quality, places, elevation, timezone belum mempunyai kredensial. Contract/parser test bukan pengganti live authentication test.
2. Flood/disaster/satellite belum terhubung ke dataset sebenarnya. Adapter kontrak dan UI unavailable tidak dihitung sebagai fitur selesai. Radar official endpoint mengembalikan 522/timeout; tidak ada radar animation atau citra hasil rekaan.
3. OSM Overpass bersifat best-effort dan intermittent. Air minum/EV pernah memberi hasil nyata namun gagal pada public snapshot terakhir; accessibility snapshot berhasil tanpa hasil. Tidak ada jaminan kelengkapan objek OSM.
4. GBFS station/vehicle feed nyata tersedia, tetapi pricing/geofencing belum diimplementasikan. Station-only scooter feeds dan semua variasi operator belum tercakup. Pemilihan operator memuat feed operator hingga batas record; belum melakukan filter radius lokal pada seluruh GBFS data.
5. DKI transport saat ini hanya layer Halte Transjakarta yang terverifikasi. KRL/stasiun bandara/GTFS departure/live vehicle belum diintegrasikan; nama fitur tidak berarti kendaraan real-time.
6. Elevation profile berupa maksimal 20 sampel terrain, bukan interpolasi rinci/risk analysis. Route handoff ke peta utama bekerja; persistensi lintas halaman untuk seluruh Active Journey dan route profile belum dibangun.
7. AI menggunakan dispatch intent dan ringkasan deterministik grounded pada provider; belum sintesis multi-layer sepanjang corridor rute. Nama tempat yang tidak bisa diresolve tidak ditebak. Pemilihan operator GBFS/nama tempat spesifik tetap memerlukan input pengguna atau GeoNames.
8. Global Data Center memuat satu dataset aktif. Layer internasional belum digabung ke seluruh peta perjalanan utama; integrasi yang tersedia adalah basemap bersama dan coordinate route handoff. Reuse instance dibuktikan untuk basemap; kontinuitas instance antarsemua navigasi layer/halaman belum diterima sebagai lulus.
9. Kamera/rute/merchant/popup dan satu skenario Active Journey terbukti dalam browser. Service area belum dapat diuji switching dengan geometri live karena GIS mengembalikan tidak tersedia pada dua titik uji. Live CCTV, sensor, traffic, community dan seluruh kombinasi GPS/rerouting belum seluruhnya dijalankan sebagai acceptance di audit ini. Source snapshot generic bukan bukti khusus bahwa setiap feed overlay telah teruji.
10. Registry/cache/rate limit belum persisten atau terdistribusi. Belum ada background ingestion scheduler, continuous provider monitoring, egress pinning, atau load test produksi.
11. Lisensi provider yang tidak eksplisit tetap dinyatakan demikian. Endpoint gratis Open-Meteo memiliki batas non-commercial; penggunaan komersial memerlukan konfigurasi/ketentuan yang sesuai. Ini tidak diklaim sebagai audit legal lisensi.
12. Full repo lint existing belum bersih; tidak diubah secara massal di luar tugas. File untracked `scripts/capture_fullpage_cctv.mjs` yang muncul selama sesi tidak disentuh atau dimasukkan ke snapshot rilis.

Aktivasi selanjutnya harus dimulai dari kredensial/feed resmi, dilanjutkan live parser/GIS/UI/freshness test per source. Tidak cukup hanya menghilangkan badge unavailable.
