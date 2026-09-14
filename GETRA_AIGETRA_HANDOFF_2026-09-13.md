# GETRA AIgetra — Handoff Terbaru

Tanggal: 13 September 2026  
Repository: `C:\Users\Revan Anthony\OneDrive\Documents\GitHub\webgis`  
Branch aktif: `AIgetra`  
HEAD awal worktree: `6f4882b799b65dc76a30921d46fa276546ee8045`  
Status: **IMPLEMENTASI LOKAL SELESAI, BELUM DI-COMMIT**

## 1. Sumber kebenaran dan keselamatan

- Gunakan current `AIgetra` worktree sebagai sumber kebenaran.
- Jangan mengambil implementasi dari `finalmerge`.
- Jangan melakukan `pull`, `push`, reset, restore global, atau membuang perubahan lokal.
- Worktree berisi perubahan frontend/backend yang saling terkait. Audit diff sebelum commit.
- Authentication role tetap hanya `USER | ADMIN`.
- `UMKM`, `INVESTOR`, dan `GOVERNMENT` tetap stakeholder/product mode.
- GIS/backend menghitung fakta spasial; AI memahami intent, menjalankan structured application action, dan menjelaskan fakta nyata.

## 2. Kondisi Git

```text
Branch: AIgetra
HEAD: 6f4882b799b65dc76a30921d46fa276546ee8045
Commit dari pekerjaan ini: BELUM ADA
Push dari pekerjaan ini: BELUM ADA
```

Semua modified dan untracked files yang disebutkan di bawah harus dipertahankan.

## 3. Implementasi terbaru

### Search dan browse Komuter

- Startup `/app` tidak lagi menampilkan error search atau kartu besar `Belum ada pencarian aktif`.
- Bootstrap lokasi dipisahkan dari explicit search dan route-origin action.
- Query kosong dapat browse berdasarkan lokasi pengguna, wilayah, atau viewport.
- `Gunakan area peta saat ini` selalu menjalankan bounded browse.
- Sesudah map digeser, request baru hanya berjalan melalui `Cari di area peta ini`.
- Heading membedakan `Di sekitar kamu`, `Di area ini`, `Hasil pencarian`, dan `Rekomendasi untukmu`.
- Generation/revision dan `AbortController` mencegah response lama menimpa search terbaru.
- Search failure membersihkan result, count, intent, marker result, dan active state dari eksekusi gagal.
- Retry mengulang query, bbox, region, filter, origin, reference criteria, dan recommendation mode yang sama.

### Filter dan area

- Label user-facing `Umum` dan `General / Commuter` diganti menjadi `Komuter`; identifier internal tetap `GENERAL`.
- Filter dan area memakai satu disclosure state sehingga tidak dapat terbuka bersamaan.
- Brand dihapus dari filter Komuter; data brand tetap dipertahankan.
- UI harga memakai `Harga maksimal` dengan semantik `observedPrice <= maxBudget`.
- Radius hanya muncul untuk referensi titik yang valid.
- Maksimum waktu jalan kaki hanya muncul bila ada origin/reference titik.
- Pilihan default mencakup lima kota Jakarta, lokasi pengguna, dan viewport saat ini.
- Satu wilayah menjadi default; multi-region hanya setelah `Pilih beberapa wilayah`.
- Tombol besar `Rute Perjalanan` di bawah Cari dihapus karena menduplikasi tab `Rute`.

### Result, map, detail, dan media

- Result organik mempertahankan rank sesuai sort aktif dan alasan deterministik dari evidence nyata.
- Thumbnail menggunakan media merchant nyata atau fallback netral.
- Result, marker, detail, routing, Community, dan advertising terhubung dengan canonical entity ID.
- Desktop mempertahankan result kiri, map tengah, detail kanan.
- Detail mempertahankan foto utama, metrics, Mengapa cocok, route, akses sekitar, jam/harga, Foto & Menu, dan Community evidence.
- Foto eligible memakai lightbox dengan previous/next, Escape, arrow keys, serta clean image fallback.
- Resolved place non-merchant tetap dapat difokuskan dan dirutekan tanpa koordinat buatan.

### Map dan basemap

- Map tetap memakai MapLibre nyata.
- Kontrol teknis top-right `Lapisan` disembunyikan untuk `GENERAL`/Komuter.
- Contextual-layer capability tetap tersedia bagi Admin, Investor, Pemerintah, dan workspace analisis.
- `Layer Peta` sidebar dan `Tampilan Peta` top-right tetap tersedia.
- Dengan browser-safe MAPID key, katalog mendukung Campuran, 2D, Light, Dark, dan Satelit.
- MAPID style yang gagal mencapai READY otomatis berpindah ke OpenFreeMap.
- Boundary, contextual overlays, route, service area, dan marker state disinkronkan kembali setelah `map.setStyle()`.
- Notifikasi fallback kecil dan hilang otomatis.

### Promosi development

- Advertising memakai arsitektur campaign/creative/targeting/placement/event yang sudah ada.
- `backend/supabase/seed.sql` menyediakan fixture idempotent:
  - `GETRA Demo Kopi Transit` — ACTIVE.
  - `GETRA Demo Bakso Komuter` — ACTIVE.
  - `GETRA Demo Sarapan Pagi` — DRAFT.
- Hanya campaign efektif `ACTIVE` yang dapat dilayani.
- Label `Promosi` tetap terpisah dari organic rank.
- Sponsored dan organic merchant dideduplikasi dengan merchant ID.
- Impression, click, route, dan profile event memakai tracking existing.
- Seed sudah diaudit statis dan service test lulus, tetapi belum diterapkan ke development database pada sesi ini.

## 4. Environment dan runtime

Audit dilakukan tanpa menampilkan nilai rahasia.

```text
frontend/.env.local                         IGNORED BY GIT
NEXT_PUBLIC_GETRA_API_BASE_URL              CONFIGURED
NEXT_PUBLIC_MAPID_STYLE_NAME                CONFIGURED
NEXT_PUBLIC_MAPID_STYLE_URL                 CONFIGURED
NEXT_PUBLIC_MAPID_BASEMAP_KEY               MISSING
```

Implikasi:

- Routing frontend sudah membaca base URL yang dikonfigurasi.
- Lima style MAPID belum aktif karena source mensyaratkan `NEXT_PUBLIC_MAPID_BASEMAP_KEY`.
- `NEXT_PUBLIC_MAPID_STYLE_URL` tidak menggantikan browser-safe basemap key pada kontrak sekarang.
- Jangan menyalin `MAPID_API_KEY` server-side ke frontend.
- Runtime yang dapat diverifikasi saat ini menggunakan OpenFreeMap.
- Restart dev server setelah menambah browser-safe key.

## 5. Blocker eksternal aktif

### Routing backend

```text
http://localhost:3000/app                                      HTTP 200
http://localhost:3000/api/health                               HTTP 502
http://localhost:3000/api/internal/routing/provider-health     HTTP 502
https://getra-routing-api.tail0ed517.ts.net/api/health          HTTP 000
```

Frontend dan proxy lokal hidup. Host routing pada port 443 tidak menerima koneksi. Pemilik backend perlu menyalakan kembali service/tunnel atau memperbaiki exposure HTTPS. Setelah service hidup, ulangi health check dan route POST nyata.

### MAPID

`NEXT_PUBLIC_MAPID_BASEMAP_KEY` masih missing. Campuran, 2D, Light, Dark, dan Satelit belum dapat diuji terhadap `style.json`, status 401/403, tile/source request, dan event `style.load`. OpenFreeMap fallback tersedia.

### Manual browser QA

Browser terintegrasi tidak tersedia pada sesi terakhir. Automated test, endpoint check, typecheck, lint, dan build sudah dijalankan; visual interaction tetap perlu diperiksa dari browser pengguna.

## 6. Validasi terakhir

Perintah:

```powershell
npm run typecheck -w frontend
npm run test -w frontend -- --run
npm run build -w frontend
npm run typecheck -w backend
npx vitest run tests/unit/umkm-advertising/ad-serving.service.test.ts
npm run build -w backend
git diff --check
```

Hasil:

```text
Frontend typecheck                 PASS
Frontend lint targeted             PASS, 0 errors/warnings
Frontend tests                     PASS, 55 files / 350 tests
Frontend production build          PASS, 21 routes
Backend typecheck                  PASS
Advertising serving tests          PASS, 7 tests
Backend production build           PASS, 80 routes
Conflict markers                   0
git diff --check                   PASS
```

## 7. File aktif

### Backend/database

- `backend/src/features/umkm-advertising/ad-serving/services/ad-serving.service.ts`
- `backend/supabase/seed.sql`
- `backend/tests/unit/umkm-advertising/ad-serving.service.test.ts`

### WebGIS utama

- `frontend/components/getra-dashboard.tsx`
- `frontend/components/getra-map.tsx`
- `frontend/lib/mapid.ts`
- `frontend/app/globals.css`
- `frontend/src/features/global-search/commuter-sidebar.css`

### Search, detail, Community, dan media

- `frontend/src/features/global-search/components/global-search-controls.tsx`
- `frontend/src/features/global-search/components/commuter-sidebar.tsx`
- `frontend/src/features/global-search/components/merchant-result-row.tsx`
- `frontend/src/features/global-search/components/place-detail-drawer.tsx`
- `frontend/src/features/global-search/community-evidence.ts` — file baru.
- `frontend/src/features/global-search/location-context.ts` — file baru.
- `frontend/src/features/ai-orchestration/place-resolver.ts`

### Header, profile, advertising, API, dan routing

- `frontend/src/components/getra-ui/getra-global-header.tsx`
- `frontend/src/components/profile/account-menu.tsx`
- `frontend/src/components/stakeholder/stakeholder-mode-switcher.tsx`
- `frontend/src/lib/user-experience.ts`
- `frontend/app/settings/profile/page.tsx`
- `frontend/app/umkm/advertising/page.tsx`
- `frontend/src/features/umkm-advertising/events/hooks/use-ad-impression.ts`
- `frontend/src/lib/api-base-url.ts`
- `frontend/src/lib/api-client.ts`
- `frontend/src/services/commuter.service.ts`
- `frontend/src/services/routing.service.ts`

### Test

- `frontend/tests/ai-place-resolver.test.ts`
- `frontend/tests/basemap/mapid-gl-style.test.ts`
- `frontend/tests/global-search/commuter-safety.test.ts`
- `frontend/tests/global-search/commuter-sidebar.test.tsx`
- `frontend/tests/global-search/global-search-controls.test.tsx`
- `frontend/tests/global-search/community-evidence.test.ts` — file baru.
- `frontend/tests/global-search/location-context.test.ts` — file baru.
- `frontend/tests/routing/routing-client.test.ts`

## 8. Manual QA berikutnya

1. Buka `/app` sebagai USER dan ADMIN.
2. Pastikan label `Komuter`, tanpa kartu idle/error startup.
3. Izinkan lokasi dan pastikan `Di sekitar kamu` tampil tanpa mengubah route origin.
4. Geser map lalu klik `Cari di area peta ini`.
5. Pilih Jakarta Pusat tanpa query dan pastikan `Di area ini` menampilkan bounded result.
6. Pastikan Filter dan Ganti area tidak terbuka bersamaan.
7. Pastikan Brand tidak ada; Radius/walking hanya muncul dengan origin titik.
8. Cari merchant dan periksa rank, reason, foto, marker, serta right detail.
9. Uji lightbox dengan Escape, Arrow Left, dan Arrow Right.
10. Verifikasi Community evidence dan provenance media.
11. Verifikasi `Promosi` tidak mengubah organic rank atau menduplikasi merchant.
12. Uji walking, motorcycle, dan car melalui tab `Rute` dan Tanya GETRA.
13. Pastikan Komuter tidak melihat `Lapisan`, tetapi tetap melihat `Tampilan Peta`.
14. Dengan MAPID key valid, uji setiap style dan pastikan state GETRA bertahan.
15. Login Admin dan pastikan campaign demo dibaca dari database nyata.

## 9. Urutan lanjutan

1. Pulihkan host routing dan verifikasi health serta route POST.
2. Dapatkan `NEXT_PUBLIC_MAPID_BASEMAP_KEY` yang aman untuk browser, restart frontend, lalu uji lima style.
3. Terapkan seed pada development database yang benar dan verifikasi campaign dari UI Admin.
4. Jalankan manual QA pada bagian 8.
5. Tinjau seluruh `git diff`, termasuk file baru, tanpa reset perubahan lokal.
6. Ulangi quality gate hanya bila ada edit lanjutan.
7. Commit ke `AIgetra` setelah blocker wajib rilis dinilai.

## 10. Larangan regresi

- Jangan mengembalikan sidebar legacy, giant dark cards, dataset city buttons, Fair Discovery switcher besar, atau detail desktop di bawah result list.
- Jangan menghapus foto merchant, Community integration, advertising architecture, routing modes, atau canonical entity identity.
- Jangan membiarkan pembayaran/sponsorship mengubah organic rank.
- Jangan mengarang merchant, koordinat, harga, jam, jarak, waktu, route, accessibility, atau Community evidence.
- Jangan mengekspos key server-side atau commit `.env.local`.
- Jangan menyimpulkan proxy 502 sebagai kegagalan UI sebelum backend eksternal pulih.

## 11. Update runtime, login, dan OpenAI — 2026-09-14

Kondisi Git saat patch ini dikerjakan:

```text
Branch aktif: Getra_Deploy
HEAD: 85e1ad6
Status awal: clean
```

Tidak ada checkout, pull, push, atau pengambilan source dari `finalmerge`.

### Login dan API frontend

- `frontend/.env.local` memuat `NEXT_PUBLIC_GETRA_API_BASE_URL=https://getra-routing-api.tail0ed517.ts.net`.
- Resolver frontend kini menerima `NEXT_PUBLIC_GETRA_API_BASE_URL` sebagai alias kompatibel.
- Arsitektur runtime lokal tetap memakai same-origin BFF: browser ke `http://localhost:3000`, lalu `GETRA_BACKEND_INTERNAL_URL` ke backend lokal `8080`.
- Empat variabel proxy frontend juga disalin ke `.env.local` root karena launcher `npm run dev` mewariskan env root ke kedua workspace.
- Frontend lama direstart agar `.env.local` dimuat ulang.
- Login admin development melalui frontend proxy berhasil dengan HTTP 200.

### Provider ChatGPT/OpenAI

- Provider aktif: `AI_PROVIDER=openai`.
- API key hanya berada pada env server-side dan tidak dipindahkan ke frontend.
- Ditemukan dua key lokal berbeda: key di env root kehabisan kredit (HTTP 429), sedangkan key di `backend/.env.local` valid (HTTP 200).
- Env root diselaraskan ke konfigurasi OpenAI backend yang valid agar launcher `npm run dev` tidak menimpa key backend.
- Setelah restart, `/api/ai/ask` mengembalikan `provider: openai` dan aksi pencarian terstruktur.

### Perbaikan intent AI

Kalimat singkat seperti `bakso di jakarta pusat` sebelumnya dapat jatuh ke jawaban bantuan umum ketika provider tidak tersedia. Sekarang extractor:

- mengenali kategori + wilayah tanpa wajib kata `cari`;
- mempertahankan Jakarta Pusat pada query pencarian;
- menghasilkan `APPLY_SEARCH_CRITERIA`;
- memakai parser deterministik sebagai fallback aman bila provider eksternal gagal;
- tetap menyerahkan pertanyaan rute, percakapan, dan pertanyaan umum ke orkestrasi AI utama.

### Verifikasi Playwright CLI

Playwright 1.63.0 dan Chromium dijalankan secara sementara, tanpa menambah dependency repository.

```text
Login /login -> /app            PASS
Tanya GETRA terbuka             PASS
Kirim "bakso di jakarta pusat" PASS
APPLY_SEARCH_CRITERIA berjalan  PASS
Query UI: bakso Jakarta Pusat   PASS
Hasil dan marker tampil         PASS
Browser console/page errors     0
```

Screenshot verifikasi sementara:

```text
%TEMP%\getra-playwright-runtime\getra-login-ai-pass.png
```

### Validasi patch

```text
Backend AI tests          PASS, 13 tests
Frontend tests            PASS, 71 files / 438 tests
Backend typecheck         PASS
Frontend typecheck        PASS
git diff --check          PASS
OpenAI Responses API      PASS, HTTP 200
Playwright browser test   PASS, 1 test
```

File source yang berubah:

- `backend/src/modules/ai/search-action.ts`
- `backend/tests/unit/ai/search-action.test.ts`
- `frontend/src/lib/api-base-url.ts`
- `frontend/tests/ai-integration.test.tsx`

File env lokal yang diselaraskan tetap diabaikan Git dan tidak boleh di-commit:

- `.env.local`

`frontend/.env.local` telah divalidasi dan sudah memuat URL yang diminta.
