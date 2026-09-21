# Arsitektur GETRA — hardening

Dibuat 2026-09-21T03:49:29.520Z. Kandidat kode: `ee65dbf027308417a206e9c65c402becf3b502ac`. Branch: `fix/production-hardening-20260920`. Status penerimaan keseluruhan: **NOT_READY**. Build: **PASS**.

Frontend: https://getra-routing-api.tail0ed517.ts.net:8443

Login: https://getra-routing-api.tail0ed517.ts.net:8443/login

Backend health: https://getra-routing-api.tail0ed517.ts.net/api/health

URL ini tetap dipertahankan. Laporan membedakan kandidat dari deployment publik.

## Alur aplikasi

Browser Next.js/MapLibre → route frontend /api/international → backend Next.js → adapter provider → validasi GeoJSON/provenance → cache TTL proses → hasil peta dan interpretasi deterministik. API auth, merchant, promo dan community memakai kebijakan endpoint serta bearer token yang sudah ada. Valhalla menjadi engine jaringan jalan; GIS tetap menghitung geometri, jarak dan waktu.

## Kepemilikan layer peta

MapLayerRegistry menyimpan id, source, jenis, visibility, dependency, reload/destroy dan pemeriksaan isLoaded. Snapshot sumber/layer aplikasi direhidrasi menurut urutan dependency sesudah setStyle; siklus dan dependency hilang dilaporkan, bukan diabaikan. Instance MapLibre, kamera, popup merchant dan state Journey dipertahankan. Marker DOM bukan layer style dan tetap dikelola pemiliknya.

MAPID adalah default; login/logout/reset mengembalikannya. Pilihan basemap pertama setelah login kini membentuk penanda sesi sebelum menyimpan pilihan. Error tile dari source style lama diabaikan. Kredensial basemap yang tidak tersedia memicu fallback terjelaskan.

## Data dan batas sistem

Registry sumber dan cache berada di memori proses, bukan database persistensi. Cache maksimal 200 kueri dengan deduplikasi in-flight. Resilience per host maksimal 200 entri, tiga percobaan, backoff 250/500 ms dan total anggaran 30 detik; circuit membuka 60 detik setelah tiga kegagalan yang dapat dicoba ulang. Auth/404/429 tidak dicoba ulang. Status sumber dan quality terpisah.

Service area mencoba RPC jaringan yang tersedia lalu Valhalla pedestrian isochrone jika RPC belum menghasilkan geometri. Kontur ditandai NETWORK_ISOCHRONE; jumlah edge/node tetap null karena tidak dihitung. Hasil bukan radius lingkaran.

CCTV registry dibagi frontend/backend lewat types/cctv-registry.ts. Player hanya memuat embed kamera terpilih. Sensor dan inference memiliki status terpisah dari keberhasilan player.
