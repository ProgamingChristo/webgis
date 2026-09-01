# Handoff Docker dan Valhalla GETRA

Tanggal handoff: 2026-08-31  
Pemilik aplikasi: tim GETRA  
Pemilik pekerjaan berikutnya: engineer Docker/VPS

## 1. Tujuan handoff

Menjalankan backend GETRA dan Valhalla pada Docker Compose, membangun graph
OpenStreetMap Jabodetabek, lalu membuktikan dengan request nyata bahwa routing
walking, motorcycle, car, dan rute Tangerang/Tangsel ke Jakarta bekerja.

Integrasi aplikasi, provider abstraction, mode mapping, response normalization,
health endpoint, timeout, dan automated tests sudah tersedia. Yang belum tersedia
di workstation pengembang saat handoff adalah Docker, `osmium-tool`, file PBF,
service Valhalla aktif, dan bukti live route.

Jangan menandai pekerjaan selesai hanya karena container berstatus `running`.
Acceptance membutuhkan route nyata dengan geometry, jarak, dan durasi.

## 2. Topologi yang harus dipertahankan

```text
Browser
  -> frontend GETRA di Vercel
  -> HTTPS API melalui reverse proxy VPS
  -> getra-backend:3000 di private Compose network
  -> valhalla:8002 di private Compose network
  -> graph OSM pada bind mount ./routing-data
```

Aturan penting:

- Frontend tidak boleh memanggil Valhalla langsung.
- Backend container harus memakai `http://valhalla:8002`, bukan `localhost`.
- Port host backend `3002` dan Valhalla `8002` tetap bind ke `127.0.0.1`.
- Hanya reverse proxy HTTPS yang boleh dibuka ke internet.
- Tidak memerlukan Google Maps routing key.
- Jangan memasukkan secret ke Vercel frontend atau variabel `NEXT_PUBLIC_*`.

Konfigurasi sumber:

- `docker-compose.yml`
- `docker-compose.routing.yml`
- `docker-compose.prod.yml`
- `Dockerfile`
- `scripts/validate-routing-data.mjs`
- `scripts/prepare-jabodetabek-routing.ps1`

## 3. Gate sebelum mulai

1. Dapatkan commit SHA atau paket perubahan yang sudah direview dari pemilik repo.
   Worktree sumber saat handoff masih memiliki perubahan yang belum di-commit;
   jangan mengarang commit atau deploy snapshot yang tidak dapat dilacak.
2. Gunakan Linux VPS dengan Docker Engine, Docker Compose v2, Node.js sesuai
   `package.json`, `curl`, dan `osmium-tool`.
3. Pastikan tersedia ruang disk untuk Java OSM extract, PBF hasil clip, image
   Docker, dan graph tiles Valhalla.
4. Siapkan DNS dan reverse proxy TLS untuk origin API.
5. Minta nilai `.env.local` melalui secret manager atau kanal aman. Jangan meminta
   credential melalui chat/ticket dan jangan menempelkan hasil expanded Compose.
6. Koordinasikan penerapan migrasi
   `backend/supabase/migrations/20260831110000_global_canonical_merchant_search.sql`
   dengan pemilik database. Engineer Docker tidak boleh mengubah database remote
   tanpa otorisasi eksplisit.

Catat sebelum deployment:

```text
GETRA_COMMIT_SHA=
VPS_HOSTNAME=
DOCKER_VERSION=
COMPOSE_VERSION=
OSM_SOURCE_DATE=
DEPLOYMENT_TIME_UTC=
```

## 4. Environment VPS

Buat root `.env.local` yang di-ignore Git. Gunakan nilai aktual dari pemilik
secret; daftar ini bukan tempat menyimpan nilainya.

```dotenv
APP_ENV=production
APP_BASE_URL=https://<api-domain>
FRONTEND_ALLOWED_ORIGINS=https://<vercel-frontend-domain>
TRUST_PROXY=true

GETRA_BIND_ADDRESS=127.0.0.1
GETRA_DOCKER_PORT=3002
VALHALLA_BIND_ADDRESS=127.0.0.1
VALHALLA_PORT=8002
VALHALLA_SERVER_THREADS=2
VALHALLA_FORCE_REBUILD=False

NEXT_PUBLIC_SUPABASE_URL=<provided-securely>
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<provided-securely>
SUPABASE_SECRET_KEY=<provided-securely-if-used>
SUPABASE_SERVICE_ROLE_KEY=<provided-securely-if-used>
```

Tambahkan credential server-only untuk fitur lain hanya bila fitur tersebut
memang diaktifkan. `FRONTEND_ALLOWED_ORIGINS` harus berupa exact origin dan tidak
boleh `*`.

Routing overlay sudah menetapkan ini di dalam backend container:

```text
ROUTING_PROVIDER=valhalla
ROUTING_BASE_URL=http://valhalla:8002
ROUTING_TIMEOUT_MS=12000
ROUTING_CACHE_TTL_MS=300000
```

Jangan menggantinya dengan URL browser atau `http://localhost:8002` di dalam
container.

## 5. Menyiapkan PBF Jabodetabek di Linux

Jalankan dari root repository:

```bash
mkdir -p routing-data
curl --fail --location --retry 3 \
  --output routing-data/java-latest.osm.pbf \
  https://download.geofabrik.de/asia/indonesia/java-latest.osm.pbf

osmium extract \
  --bbox 106.30,-6.90,107.25,-5.85 \
  routing-data/java-latest.osm.pbf \
  --output routing-data/jabodetabek.osm.pbf \
  --overwrite

osmium fileinfo routing-data/jabodetabek.osm.pbf
sha256sum routing-data/jabodetabek.osm.pbf
npm run routing:validate
```

Bounding box tersebut mencakup DKI Jakarta, Tangerang, Tangerang Selatan,
Depok, Bekasi, Bogor, dan jaringan penghubungnya. Jangan memperkecil coverage
tanpa mengulang acceptance cross-region.

Setelah `routing:validate` PASS dan checksum dicatat, Java extract yang besar
boleh dihapus secara manual bila kebijakan penyimpanan mengizinkan. Jangan hapus
`routing-data/jabodetabek.osm.pbf` atau tiles aktif.

Untuk Windows lokal, gunakan:

```powershell
npm run routing:prepare
npm run routing:validate
```

Perintah tersebut membutuhkan `osmium` pada `PATH`.

## 6. Validasi Compose dan startup

```bash
npm run docker:prod:config
npm run docker:prod:start
npm run docker:prod:status
```

Startup pertama membangun graph dan dapat berlangsung lama. Script menunggu
hingga 40 menit. Jangan membatalkan hanya karena proses build belum langsung
healthy.

Jika startup gagal, ambil log terbatas tanpa menampilkan environment:

```bash
docker compose --env-file .env.local \
  -f docker-compose.yml \
  -f docker-compose.routing.yml \
  -f docker-compose.prod.yml \
  ps

docker compose --env-file .env.local \
  -f docker-compose.yml \
  -f docker-compose.routing.yml \
  -f docker-compose.prod.yml \
  logs --tail 200 valhalla getra-backend
```

Expected:

- `valhalla` healthy.
- `getra-backend` healthy.
- Host `127.0.0.1:8002/status` mengembalikan HTTP 200.
- Host `127.0.0.1:3002/api/health` mengembalikan respons health GETRA.

## 7. Buktikan konektivitas internal Docker

Tes ini membuktikan backend container dapat menyelesaikan DNS service `valhalla`
dan menjangkaunya melalui network Compose:

```bash
docker compose --env-file .env.local \
  -f docker-compose.yml \
  -f docker-compose.routing.yml \
  -f docker-compose.prod.yml \
  exec getra-backend \
  node -e "fetch('http://valhalla:8002/status').then(async r=>{console.log(r.status);process.exit(r.ok?0:1)}).catch(e=>{console.error(e.name);process.exit(1)})"
```

Expected: `200`. Jangan mencetak base URL yang mengandung credential; URL
Valhalla internal di atas tidak mengandung credential.

## 8. Uji langsung Valhalla per mode

Nearby test coordinates:

```text
origin      -6.214120, 106.682990
destination -6.218000, 106.687000
```

Jalankan ketiga costing berikut dari host VPS:

```bash
for costing in pedestrian motorcycle auto; do
  echo "Testing $costing"
  curl --fail --silent --show-error \
    http://127.0.0.1:8002/route \
    -H 'content-type: application/json' \
    --data "{\"locations\":[{\"lat\":-6.214120,\"lon\":106.682990},{\"lat\":-6.218000,\"lon\":106.687000}],\"costing\":\"$costing\",\"units\":\"kilometers\"}" \
    | node -e "let b='';process.stdin.on('data',d=>b+=d).on('end',()=>{const j=JSON.parse(b);const s=j.trip?.summary;const shape=j.trip?.legs?.[0]?.shape;if(!(s?.length>0&&s?.time>0&&shape))process.exit(1);console.log(JSON.stringify({length_km:s.length,time_seconds:s.time,has_shape:true}))})"
done
```

Setiap mode harus menghasilkan:

- exit code 0;
- `length_km > 0`;
- `time_seconds > 0`;
- encoded route shape tersedia.

Hasil antar-mode tidak wajib selalu berbeda pada setiap ruas, tetapi request
harus benar-benar memakai costing yang berbeda. Jangan menyalin hasil satu mode
untuk mode lain.

## 9. Uji cross-region

Gunakan koordinat uji Gading Serpong ke pusat Jakarta:

```text
origin      -6.241400, 106.628100
destination -6.175400, 106.827200
```

```bash
for costing in motorcycle auto; do
  echo "Cross-region $costing"
  curl --fail --silent --show-error \
    http://127.0.0.1:8002/route \
    -H 'content-type: application/json' \
    --data "{\"locations\":[{\"lat\":-6.241400,\"lon\":106.628100},{\"lat\":-6.175400,\"lon\":106.827200}],\"costing\":\"$costing\",\"units\":\"kilometers\"}" \
    | node -e "let b='';process.stdin.on('data',d=>b+=d).on('end',()=>{const j=JSON.parse(b);const s=j.trip?.summary;const shape=j.trip?.legs?.[0]?.shape;if(!(s?.length>0&&s?.time>0&&shape))process.exit(1);console.log(JSON.stringify({length_km:s.length,time_seconds:s.time,has_shape:true}))})"
done
```

Jika `171` muncul, periksa coordinate order, graph tiles, dan coverage. Jika
`170` atau `442` muncul, titik berhasil dikorelasikan tetapi jaringan/costing
tidak menghasilkan jalur. Jangan mengubahnya menjadi straight-line route.

## 10. Uji melalui backend GETRA

Gunakan akun test USER biasa dan access token sementara. Jangan menulis token ke
repository atau membagikannya pada hasil handoff.

```bash
export GETRA_API_ORIGIN='https://<api-domain>'
export GETRA_TEST_TOKEN='<temporary-user-token>'

curl --fail --silent --show-error \
  "$GETRA_API_ORIGIN/api/internal/routing/provider-health" \
  -H "Authorization: Bearer $GETRA_TEST_TOKEN"
```

Expected health data:

```json
{
  "provider": "valhalla",
  "status": "READY",
  "configured": true,
  "reachable": true,
  "reason_code": null
}
```

Respons aktual dibungkus oleh envelope API GETRA. Jangan mengharapkan URL
provider muncul pada response.

Kemudian uji normalized routing API untuk `walking`, `motorcycle`, dan `car`:

```bash
for mode in walking motorcycle car; do
  echo "GETRA API $mode"
  curl --fail --silent --show-error \
    "$GETRA_API_ORIGIN/api/routing" \
    -H "Authorization: Bearer $GETRA_TEST_TOKEN" \
    -H 'content-type: application/json' \
    --data "{\"origin\":{\"latitude\":-6.214120,\"longitude\":106.682990},\"destination\":{\"latitude\":-6.218000,\"longitude\":106.687000},\"mode\":\"$mode\"}" \
    | node -e "let b='';process.stdin.on('data',d=>b+=d).on('end',()=>{const j=JSON.parse(b);const r=j.data;if(!(r?.route_status==='ROUTABLE'&&r.distance_meters>0&&r.duration_seconds>0&&r.geometry?.coordinates?.length>1))process.exit(1);console.log(JSON.stringify({mode:r.mode,status:r.route_status,distance_meters:r.distance_meters,duration_seconds:r.duration_seconds,points:r.geometry.coordinates.length}))})"
done
```

Hapus token dari shell setelah selesai:

```bash
unset GETRA_TEST_TOKEN
```

## 11. Acceptance checklist wajib

Kembalikan checklist berikut beserta output yang sudah disanitasi:

```text
[ ] Commit SHA deployment dicatat
[ ] PBF source date, ukuran, dan SHA-256 dicatat
[ ] npm run routing:validate PASS
[ ] npm run docker:prod:config PASS
[ ] valhalla healthy
[ ] getra-backend healthy
[ ] backend container -> http://valhalla:8002/status PASS
[ ] direct pedestrian route: geometry + distance + duration PASS
[ ] direct motorcycle route: geometry + distance + duration PASS
[ ] direct auto route: geometry + distance + duration PASS
[ ] cross-region motorcycle PASS
[ ] cross-region auto PASS
[ ] authenticated provider-health READY
[ ] authenticated GETRA walking route PASS
[ ] authenticated GETRA motorcycle route PASS
[ ] authenticated GETRA car route PASS
[ ] reverse proxy HTTPS /api/health PASS
[ ] port 3002 tidak terbuka publik
[ ] port 8002 tidak terbuka publik
[ ] tidak ada secret pada log atau tiket
```

Setelah checklist backend selesai, koordinasikan browser QA dengan pemilik
frontend untuk membuktikan pencarian merchant di luar viewport, map focus,
destination selection, ETA/distance, LineString, dan mode switching.

## 12. Troubleshooting

| Gejala | Pemeriksaan | Tindakan |
| --- | --- | --- |
| `routing:validate` gagal | PBF tidak ada atau kurang dari 1 MB | Ulangi download/clip dan jalankan `osmium fileinfo`. |
| Valhalla lama `starting` | Initial graph build masih berlangsung | Periksa log Valhalla dan disk; tunggu sampai healthcheck lulus. |
| Valhalla restart loop | PBF rusak, volume tidak writable, atau resource host habis | Periksa log terbatas, permission `routing-data`, disk, dan memory. |
| Host `/status` gagal | Bind/port/container belum sehat | Periksa Compose `ps`, healthcheck, dan loopback port 8002. |
| Backend tidak menjangkau Valhalla | DNS Compose atau overlay tidak digunakan | Pastikan tiga file Compose digunakan dan URL tetap `http://valhalla:8002`. |
| Semua mode `SERVICE_UNAVAILABLE` | Provider timeout/unreachable | Cek provider-health dan log `[ROUTING] Provider request failed`. |
| `171` | Tidak ada edge sesuai mode dekat input | Verifikasi `[lat, lon]`, coverage PBF, dan kualitas OSM di sekitar titik. |
| `170`/`442` | Region terputus atau tidak ada path | Uji titik lain, costing, dan coverage; jangan fabrikasi geometry. |
| Provider direct PASS, API gagal | Auth, rate limit, backend env, atau normalization | Cek request ID pada log backend tanpa mencetak token. |
| API PASS, browser gagal | Origin API Vercel/CORS atau frontend auth | Verifikasi `NEXT_PUBLIC_GETRA_API_URL` dan exact allowed origin. |

## 13. Refresh graph dan rollback

Refresh graph hanya pada maintenance window. Catat source date dan checksum baru,
siapkan backup PBF sebelumnya, lalu jalankan satu kali:

```bash
VALHALLA_FORCE_REBUILD=True npm run docker:prod:start
```

Jangan menyimpan `VALHALLA_FORCE_REBUILD=True` untuk restart rutin.

Jika release gagal:

1. Simpan log dan output health yang sudah disanitasi.
2. Hentikan stack dengan `npm run docker:prod:stop` jika diperlukan.
3. Kembali ke commit/image dan PBF terakhir yang sebelumnya terbukti sehat.
4. Jalankan kembali config, startup, dan seluruh smoke test inti.
5. Jangan menjalankan `docker system prune`, menghapus volume, atau menghapus
   `routing-data` sebagai langkah troubleshooting otomatis.

## 14. Bukti yang dikembalikan ke pemilik GETRA

Kirim satu laporan ringkas berisi:

- commit SHA;
- versi Docker/Compose dan hostname non-sensitif;
- tanggal sumber, ukuran, dan checksum PBF;
- status kedua container;
- hasil internal DNS test;
- distance/duration untuk 3 nearby modes;
- distance/duration untuk 2 cross-region modes;
- provider-health dan GETRA normalized route status;
- blocker yang masih ada dengan potongan log aman;
- waktu pengujian dan nama engineer.

Jangan kirim `.env.local`, token, expanded Compose configuration, stack trace yang
mengandung header, atau credential apa pun.

## Referensi repository

- `docs/ROUTING_NAVIGATION.md`
- `docs/VERCEL_DEPLOYMENT.md`
- `docs/DOCKER_USAGE.txt`
- `docs/changes/SEARCH_ROUTING_HARDENING_2026-08-31.md`
