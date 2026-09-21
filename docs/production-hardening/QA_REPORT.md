# QA dan release gate

Dibuat 2026-09-21T03:54:06.357Z. Kandidat kode: `ee65dbf027308417a206e9c65c402becf3b502ac`. Branch: `fix/production-hardening-20260920`. Status penerimaan keseluruhan: **NOT_READY**. Build: **PASS**.

Frontend: https://getra-routing-api.tail0ed517.ts.net:8443

Login: https://getra-routing-api.tail0ed517.ts.net:8443/login

Backend health: https://getra-routing-api.tail0ed517.ts.net/api/health

URL ini tetap dipertahankan. Laporan membedakan kandidat dari deployment publik.

## Bukti yang lulus

- Frontend: 81 file, 588 tes PASS. Backend: 183 file PASS, 2 file skipped; 1.759 tes PASS, 3 skipped. Total 2.347 PASS, 0 failed.
- Typecheck frontend/backend/root: PASS. Lint frontend/backend dengan max-warnings=0: PASS.
- Basemap browser: OSM, Esri dan kembali MAPID dengan instance/zoom/center/route/merchant popup tetap; CARTO fallback diuji, tile CARTO belum tersedia.
- Journey dengan GPS emulasi tetap aktif saat tiga pergantian basemap. Service-area kontur jaringan tidak hilang saat tiga pergantian.
- Responsive: 84 pemeriksaan pada enam viewport, PASS. 390×844, 430×932, 768×1024, 1024×768, 1280×800, 1440×900.
- Keamanan HTTP: 9/9 PASS. Aksesibilitas otomatis tiga halaman: PASS.
- AI: 154 HTTP sukses; kecocokan kategori 99.35%, bukan akurasi faktual.

## Gate yang belum lulus

- CARTO Light/Dark: kredensial belum tersedia; fallback MAPID teruji, tetapi tile CARTO belum lolos uji nyata.
- NASA FIRMS, OpenAQ, GeoNames: kredensial belum tersedia. Fire, air-quality, places, elevation, timezone mengembalikan AUTH_REQUIRED.
- Flood, disaster dan satellite: kontrak feed resmi belum terhubung. Radar/Overpass dapat gagal di penyedia; tidak diganti data contoh.
- CCTV AI: tidak ada input frame ke layanan inference. Seluruh hitungan, FPS, model dan bounding box harus tetap tidak tersedia.
- Sensor: 9 entri inventory, 0 sensor dengan observasi runtime terverifikasi; tidak boleh dinyatakan sebagai sensor aktif.
- Deployment publik berubah oleh pekerjaan paralel. Audit publik masih menemukan canvas sintetis dengan klaim YOLOv8/TensorRT dan hitungan objek; kandidat menghapusnya tetapi belum dipromosikan. Bukti kandidat bukan bukti versi publik.
- Belum ada audit manual WCAG menyeluruh, pengukuran LCP/INP lapangan, atau pengujian payload lengkap untuk setiap adapter.
- Skor hallucination/groundedness 154 jawaban belum diukur dengan review klaim per klaim. Full-screen mobile dan pengujian transaksi pembayaran produksi belum lengkap.

P0/P1 belum dapat dinyatakan nol. Tidak ada klaim READY. Kesimpulan: **NOT_READY untuk keseluruhan master work order**; perbaikan yang teruji tersedia sebagai kandidat terpisah. HTTP publik atau build sukses saja tidak menutup gate fitur.

## Reproduksi

npm test; npm run typecheck; npm run lint. scripts/verify-main-basemap-browser.mjs; verify-service-area-basemap.mjs; verify-international-browser.mjs; verify-hardening-browser.mjs; verify-hardening-accessibility.mjs; verify-hardening-security.mjs; evaluate-hardening-ai.mjs. QA-only Playwright/axe dipasang dengan npm install --prefix outputs/qa-tools --no-save --package-lock=false @playwright/test @axe-core/playwright; tidak menambah dependency aplikasi. Variabel GETRA_QA_URL/API menentukan kandidat; jangan salah menguji backend produksi dari frontend kandidat.


## Uji image produksi di VM

Image frontend/backend memakai SHA ee65dbf027308417a206e9c65c402becf3b502ac. Base localhost:3100/8180 pada laporan VM adalah SSH tunnel ke kandidat production build, bukan next dev. Runtime smoke: PASS; tiga URL kandidat HTTP 200, walking/motorcycle/car ROUTABLE, AI Vision UNAVAILABLE tanpa canvas sintetis.

Daftar sumber dapat bertambah setelah efek UI selesai memuat. Pemeriksaan overlay membandingkan setiap source awal menurut ID, jumlah record dan geometri rute, sambil mengizinkan source baru yang tidak menghapus overlay lama. Service area juga diuji benar-benar rendered pada zoom 15.
