# GETRA Production Progress

Terakhir diperbarui: 27 Agustus 2026

## Phase 2 Independent Verification

- [x] Clean `npm ci`, typecheck, lint, automated tests, production builds, runtime dependency audit, and client bundle secret-name scan verified.
- [x] Invalid migration quoting, legacy recursive admin policies, stale admin endpoint policy, AI error leakage/provider failover, MAPID response contract, spatial input bounds, and Docker standalone path repaired.
- [ ] `BLOCKED`: fresh Supabase reset, pgTAP/RLS actor matrix, and PostGIS query-plan verification require a running Docker Linux daemon.
- [ ] `BLOCKED`: live Claude, MAPID, backup/restore, monitoring, and deployed health verification require external credentials/infrastructure.
- [ ] `NOT READY`: production multi-instance deployment requires a shared rate-limit store or an explicit single-instance operational constraint.
- [ ] Regenerate database types after the reconciled schema passes a fresh reset; current generated types retain legacy stakeholder enum values.

## Arti Status

- [x] Selesai dan sudah diverifikasi.
- [ ] Belum selesai atau belum diverifikasi.
- `IN PROGRESS`: sedang menjadi fokus aktif.
- `BLOCKED`: membutuhkan credential, data, keputusan, atau akses eksternal.
- `GATE`: wajib lulus sebelum masuk fase berikutnya.

## Target Production

- [ ] GETRA beroperasi sebagai WebGIS Spatial Decision Support System, bukan sekadar dashboard atau chatbot.
- [ ] Empat mode pengguna tersedia: Komuter, UMKM, Investor, dan Pemerintah Daerah.
- [ ] Semua fakta spasial dihitung GIS atau pipeline deterministik, bukan dibuat oleh AI.
- [ ] Semua hasil analisis menampilkan sumber, waktu, metode, cakupan, status validasi, dan keterbatasan.
- [ ] MAPID, Community Maps, data survei, dan data terbuka masuk melalui pipeline yang dapat diaudit.
- [ ] Aplikasi tetap menghasilkan hasil GIS ketika AI atau provider eksternal gagal.
- [ ] Production memiliki authentication, authorization, monitoring, backup, rollback, dan runbook insiden.

## Fase 0 - Konsep dan Persyaratan

Status: `COMPLETED`

- [x] Membaca proposal GETRA dan dokumen konsep awal.
- [x] Membaca technical meeting dan PRD penyelenggara kompetisi.
- [x] Membaca ketentuan Data dan WebGIS MAPID terbaru.
- [x] Menentukan GETRA sebagai spatial decision support untuk kawasan transit.
- [x] Menentukan empat stakeholder utama.
- [x] Memisahkan tanggung jawab AI, GIS, data, dan UI.
- [x] Mendokumentasikan konsep pada `CONTEXT.md` dan `docs/GETRA_CONCEPT.md`.
- [x] Mendokumentasikan aturan kompetisi pada `docs/COMPETITION_REQUIREMENTS.md`.
- [x] Menentukan prioritas MVP dan batas fitur roadmap.
- [x] `GATE`: Konsep produk dan batas tanggung jawab teknis terdokumentasi.

## Fase 1 - Design System dan Prototype WebGIS

Status: `COMPLETED`

- [x] Membuat design system Geo Spatial Console.
- [x] Membuat workspace gelap yang map-led dan responsif.
- [x] Membuat command dock, daftar hasil, detail hasil, provenance, dan limitation state.
- [x] Membuat fallback map agar aplikasi tetap dapat digunakan ketika basemap gagal.
- [x] Mengintegrasikan MapLibre sebagai renderer peta.
- [x] Memilih MAPID `street-2d-building` sebagai basemap analisis utama.
- [x] Memisahkan marker, rute, service area, transit, dan selected state.
- [x] Memastikan build production berhasil dengan `vinext build`.
- [x] `GATE`: Prototype WebGIS dapat dibangun dan digunakan tanpa credential database.

## Fase 2 - Universal AI dan Grounded Search

Status: `COMPLETED WITH EXTERNAL BLOCKER`

- [x] Membuat schema intent pencarian menggunakan Zod.
- [x] Membuat endpoint Geo-AI Search.
- [x] Membuat orchestration flow: intent, tool call, ranking, explanation, dan provenance.
- [x] Membuat interface provider AI universal `generateStructured()`.
- [x] Membuat adapter OpenAI Responses API.
- [x] Membuat adapter Claude structured output.
- [x] Menambahkan pemilihan provider melalui `AI_PROVIDER=openai|claude`.
- [x] Menambahkan failover antar-provider.
- [x] Menambahkan fallback parser dan explanation deterministik.
- [x] Menambahkan timeout, cooldown, schema validation, dan secret isolation.
- [x] Menambahkan test structured output OpenAI dengan mock.
- [x] Memastikan key AI tidak masuk client bundle atau artifact build.
- [ ] `BLOCKED`: Live OpenAI generation menunggu quota atau billing aktif.
- [ ] `BLOCKED`: Live Claude generation menunggu `ANTHROPIC_API_KEY` jika Claude akan diuji.
- [x] `GATE`: Fitur pencarian tetap berfungsi tanpa provider AI.

## Fase 3 - Supabase, PostGIS, dan Model Data

Status: `IN PROGRESS`

- [x] Membuat migration awal untuk PostGIS dan pgRouting.
- [x] Membuat tabel transit, pedestrian graph, merchant, survey, score, analysis run, dan feature registry.
- [x] Membuat spatial index awal.
- [x] Mengaktifkan RLS pada tabel utama.
- [x] Membuat RPC pencarian merchant berbasis jarak awal.
- [x] Membuat migration kompetisi untuk Activity, Mission, evidence, ingestion, moderation, dan AI trace.
- [x] Mendapatkan dan memvalidasi Supabase project URL.
- [x] Mendapatkan dan memvalidasi Supabase publishable key.
- [x] Mendapatkan dan memvalidasi Supabase secret key untuk backend.
- [ ] Mendapatkan database connection string untuk migration.
- [ ] Menghapus ketergantungan runtime Cloudflare D1 yang tidak digunakan GETRA.
- [x] Membuat Supabase browser client dengan publishable key.
- [x] Membuat Supabase admin client server-only dengan secret key.
- [ ] Menjalankan migration pada environment development.
- [ ] Membuat seed data pilot Dukuh Atas yang jelas berstatus synthetic atau pilot.
- [x] Menambahkan schema provenance canonical untuk setiap record.
- [ ] Menambahkan status `unverified`, `surveyed`, `verified`, `stale`, dan `rejected` yang konsisten.
- [ ] Menambahkan audit log untuk ingestion, moderation, dan perubahan data penting.
- [ ] Menguji RLS untuk anonymous, authenticated user, contributor, moderator, dan admin.
- [ ] `GATE`: Tidak ada endpoint production yang membaca data utama dari array demo.
- [ ] `GATE`: Semua akses database lolos integration test dan RLS test.

## Fase 4 - Integrasi MAPID dan Pipeline Data

Status: `FOUNDATION STARTED`

- [x] Mengintegrasikan MAPID basemap pada frontend sesuai pola map-service identifier.
- [x] Memisahkan schema raw Community Activity, Menu Go, Struk Go, dan Properti Go.
- [x] Menetapkan raw competition data sebagai backend-only melalui RLS dan privilege revoke.
- [ ] Memverifikasi kontrak resmi endpoint MAPID Apps yang digunakan tim.
- [ ] Mendapatkan backend API key untuk MAPID Apps.
- [ ] Membuat adapter backend MAPID dengan header `x-api-key`.
- [ ] Mengintegrasikan Menu Go untuk data merchant dan atribut usaha.
- [ ] Mengintegrasikan Struk Go untuk sinyal transaksi agregat yang diizinkan.
- [ ] Mengintegrasikan Properti Go untuk data ruang usaha yang diizinkan.
- [ ] Mengintegrasikan Community Maps Activity sebagai evidence naratif dan field context.
- [ ] Memisahkan Community Activity dari MAPID Mission pada schema dan UI.
- [ ] Membuat deduplication berdasarkan source ID, koordinat, waktu, dan fingerprint atribut.
- [ ] Membuat data freshness policy dan stale-data detection.
- [ ] Membuat privacy filter untuk foto, struk, dan informasi pribadi.
- [ ] Membuat pipeline retry, dead-letter handling, dan ingestion report.
- [ ] Mendokumentasikan batas redistribusi data MAPID dan partner.
- [ ] `GATE`: Setiap record dapat ditelusuri ke sumber dan waktu pengumpulan.
- [ ] `GATE`: Tidak ada protected MAPID key atau raw restricted data di browser.

## Fase 5 - GIS dan Pedestrian Network Production

Status: `NOT STARTED`

- [ ] Menentukan sumber pedestrian network untuk area pilot.
- [ ] Melakukan topology cleaning dan snapping pedestrian nodes.
- [ ] Menghitung edge length dan base walking time.
- [ ] Menambahkan atribut step-free, guiding block, safe crossing, lighting, dan comfort.
- [ ] Membuat pgRouting route function untuk jalur tercepat.
- [ ] Membuat comfort-aware route function.
- [ ] Membuat service-area atau isochrone berbasis jaringan, bukan radius lurus.
- [ ] Membuat route switch dan avoid-segment behavior.
- [ ] Membuat accessibility score dengan komponen yang dapat dijelaskan.
- [ ] Membuat method version dan graph version untuk reproduksibilitas.
- [ ] Menguji hasil GIS terhadap sampel walking time lapangan.
- [ ] Menghapus polyline, jarak, dan service area sintetis dari mode production.
- [ ] `GATE`: Error walking time pilot berada dalam toleransi yang disepakati tim.
- [ ] `GATE`: Semua route dan score memiliki sumber, versi metode, dan timestamp.

## Fase 6 - Fitur Inti Empat Stakeholder

Status: `NOT STARTED`

- [ ] Menyelesaikan Smart Search komuter dengan hard constraint dan soft preference.
- [ ] Menyelesaikan Fair Discovery dan Hidden Gem tanpa mencampur sponsored ranking.
- [ ] Menyelesaikan Smart Alternative yang menyebut constraint yang dilonggarkan.
- [ ] Menyelesaikan profil dan spatial discoverability UMKM.
- [ ] Menyelesaikan Demand Pulse berbasis data pilot yang terukur.
- [ ] Menyelesaikan Retail Gap dengan metodologi dan limitation yang terlihat.
- [ ] Menyelesaikan perbandingan lokasi untuk investor tanpa klaim jaminan keuntungan.
- [ ] Menyelesaikan area profile dan intervention priority untuk pemerintah.
- [ ] Menyelesaikan Sponsored Pin dengan label dan analytics terpisah.
- [ ] Menyelesaikan evidence drawer untuk setiap hasil utama.
- [ ] Menyelesaikan sinkronisasi pilihan antara peta, result row, dan evidence drawer.
- [ ] `GATE`: Satu judging scenario end-to-end berjalan dengan data pilot nyata.
- [ ] `GATE`: Organic result dan sponsored result tidak dapat tertukar secara visual atau logika.

## Fase 7 - Community Mapping dan Moderasi

Status: `NOT STARTED`

- [ ] Membuat authentication untuk contributor.
- [ ] Membuat submission lokasi, narasi, atribut, dan evidence photo.
- [ ] Membuat validasi koordinat, waktu, media, dan kelengkapan atribut.
- [ ] Membuat duplicate detection dan fake-evidence flags.
- [ ] Membuat moderation queue untuk status pending, revision, verified, dan rejected.
- [ ] Membuat contributor trust score yang dapat diaudit.
- [ ] Membuat privacy redaction untuk evidence sensitif.
- [ ] Membuat Community Activity layer dan validation state pada peta.
- [ ] Membuat accessibility issue reporting dan confirmation flow.
- [ ] Membuat export evidence kompetisi yang tidak melanggar privasi.
- [ ] `GATE`: Record yang belum diverifikasi tidak tampil sebagai fakta terverifikasi.
- [ ] `GATE`: Seluruh aksi moderation tercatat pada audit log.

## Fase 8 - Security, Reliability, dan Observability

Status: `FOUNDATION STARTED`

- [x] Membuat reusable API guard untuk endpoint publik.
- [x] Membatasi content type dan ukuran request endpoint AI.
- [x] Menolak browser request dari origin yang tidak diizinkan.
- [x] Menambahkan request ID dan respons error yang tidak membocorkan exception internal.
- [x] Menambahkan baseline security headers pada aplikasi dan API response.
- [x] Menambahkan rate limiter per-isolate sebagai proteksi awal endpoint AI.
- [ ] Menetapkan role anonymous, user, contributor, UMKM owner, moderator, dan admin.
- [ ] Menerapkan authorization pada setiap server route dan database operation.
- [ ] Menambahkan distributed rate limit untuk search, AI, upload, dan contribution endpoint.
- [ ] Menambahkan request size limit dan file validation.
- [ ] Menyelesaikan CSP production dan verifikasi seluruh domain tile, asset, storage, dan API.
- [ ] Menambahkan secret management untuk development, staging, dan production.
- [ ] Merotasi key yang pernah dibagikan melalui chat sebelum production.
- [ ] Menambahkan structured logging tanpa personal data atau credential.
- [ ] Menambahkan error tracking dan alerting.
- [ ] Menambahkan health check untuk database, MAPID, storage, dan AI secara aman.
- [ ] Menambahkan retry, timeout, circuit breaker, dan graceful degradation.
- [ ] Menetapkan backup, point-in-time recovery, restore drill, dan retention policy.
- [ ] Membuat incident response dan provider outage runbook.
- [ ] `GATE`: Security review tidak memiliki temuan critical atau high yang terbuka.
- [ ] `GATE`: Restore database berhasil diuji pada environment non-production.

## Fase 9 - Quality Assurance dan Acceptance

Status: `NOT STARTED`

- [x] Delapan integration dan security test awal lulus.
- [x] Lint file AI dan UI terkait lulus.
- [x] Build production awal lulus.
- [ ] Memperbaiki ambient type Cloudflare agar full TypeScript check lulus.
- [ ] Menambahkan unit test ranking, scoring, dan constraint relaxation.
- [ ] Menambahkan integration test Supabase, RLS, MAPID adapter, dan GIS RPC.
- [ ] Menambahkan contract test untuk OpenAI dan Claude adapter.
- [ ] Menambahkan end-to-end test untuk empat stakeholder.
- [ ] Menambahkan visual regression test untuk desktop dan mobile.
- [ ] Menambahkan keyboard-navigation dan screen-reader test.
- [ ] Menambahkan WCAG AA contrast test.
- [ ] Menambahkan reduced-motion test.
- [ ] Menambahkan load test untuk pencarian, map data, dan concurrent users.
- [ ] Menambahkan failure test untuk AI down, MAPID down, database timeout, dan partial data.
- [ ] Melakukan user acceptance test dengan skenario lomba dan skenario operasional.
- [ ] `GATE`: Semua test critical path lulus di CI.
- [ ] `GATE`: Tidak ada known blocker severity critical atau high.

## Fase 10 - Staging, Deployment, dan Production Launch

Status: `NOT STARTED`

- [ ] Menentukan target hosting production dan region deployment.
- [ ] Membuat environment development, staging, dan production yang terpisah.
- [ ] Membuat CI untuk lint, type-check, test, build, migration check, dan secret scan.
- [ ] Membuat CD staging dengan preview URL.
- [ ] Menjalankan migration staging dan seed pilot.
- [ ] Menjalankan acceptance test penuh di staging.
- [ ] Menyiapkan custom domain, HTTPS, DNS, dan redirect policy.
- [ ] Menyiapkan production Supabase, storage, backup, dan RLS.
- [ ] Menyiapkan production MAPID key dan provider AI key yang sudah dirotasi.
- [ ] Menambahkan analytics yang patuh privasi.
- [ ] Menambahkan uptime monitor dan alert channel.
- [ ] Membuat deployment rollback procedure.
- [ ] Membuat database rollback atau forward-fix procedure.
- [ ] Membuat operator runbook dan handover documentation.
- [ ] Menjalankan smoke test setelah deployment production.
- [ ] Memverifikasi attribution, privacy notice, terms, dan data limitation pada production.
- [ ] `GATE`: Product owner menyetujui production acceptance checklist.
- [ ] `GATE`: Monitoring, backup, rollback, dan incident owner aktif.
- [ ] `PRODUCTION`: GETRA tersedia pada domain production dan seluruh critical flow terverifikasi.

## Input yang Dibutuhkan dari Tim

- [x] `NEXT_PUBLIC_SUPABASE_URL`.
- [x] `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- [x] `SUPABASE_SECRET_KEY` untuk backend.
- [ ] `DATABASE_URL` untuk menjalankan migration.
- [ ] Konfirmasi apakah project Supabase masih kosong atau sudah memiliki schema/data.
- [ ] Backend MAPID Apps API key dan dokumentasi endpoint yang diberikan penyelenggara.
- [ ] Data Community Maps Activity atau export awal untuk area pilot.
- [ ] Keputusan batas area pilot dan daftar stasiun prioritas.
- [ ] Keputusan provider AI production dan budget bulanan.
- [ ] Keputusan target hosting, domain, dan pemilik akun production.

## Konfigurasi Provider AI

- [x] OpenAI dapat dipilih dengan `AI_PROVIDER=openai`.
- [x] Claude dapat dipilih dengan `AI_PROVIDER=claude`.
- [x] Provider kedua menjadi failover jika memiliki credential.
- [x] Fallback deterministik menjadi jalur terakhir.
- [x] Provider key hanya boleh menggunakan environment variable server-side.

## Log Keputusan

- [x] 16 Agustus 2026: Memilih MAPID `street-2d-building` sebagai basemap analisis utama.
- [x] 16 Agustus 2026: Menetapkan OpenAI dan Claude di belakang satu interface provider universal.
- [x] 16 Agustus 2026: Menetapkan Supabase/PostGIS sebagai database geospasial utama; Cloudflare D1 tidak digunakan untuk domain data GETRA.
