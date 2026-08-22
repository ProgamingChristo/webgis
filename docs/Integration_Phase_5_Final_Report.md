# GETRA — Integration Phase 5 Final Report

## GEO MAPID / MAPID Apps API Discovery

Tanggal audit: 2026-08-22 (Asia/Jakarta)

Scope audit ini berhenti pada discovery, verification, dan contract documentation. Tidak ada write request ke MAPID, tidak ada ingestion job produksi, tidak ada data MAPID yang dimasukkan ke GETRA, dan Phase 6 tidak dimulai.

### A. Overall Status

| Gate | Status | Dasar |
| --- | --- | --- |
| PHASE 4 CLOSURE | FAIL | Quality dan Auth E2E sudah PASS, tetapi migration history tidak reproducible dan token Supabase berisi PII pernah masuk Git history. |
| PHASE 5 | BLOCKED | Credential serta project/layer/activity identifier MAPID tidak tersedia, sehingga minimum satu authorized live provider read tidak dapat dilakukan. |
| PHASE 6 READINESS | NOT READY | Contract MAPID Apps, live response, record ID, pagination, timestamp, dan auth activity API belum terverifikasi. |

Phase 5 tidak diklaim PASS hanya dari dokumentasi. Endpoint GEO layer yang ditemukan tidak dipromosikan menjadi endpoint MAPID Apps karena keduanya belum terbukti memakai contract yang sama.

### B. Phase 4 Closure Evidence

#### B.1 Quality gate final

Semua command diambil dari scripts pada package.json masing-masing dan dijalankan pada workspace aktual.

| Workspace | Gate | Command | Result | Evidence |
| --- | --- | --- | --- | --- |
| Frontend | Typecheck | npm run typecheck --workspace frontend | PASS | tsc --noEmit, exit 0 |
| Frontend | Lint | npm run lint --workspace frontend | PASS | eslint . --max-warnings=0, exit 0 |
| Frontend | Test | Tidak ada script test pada frontend/package.json | NOT APPLICABLE | package.json hanya memuat dev, build, start, lint, typecheck, serta predev/prebuild |
| Frontend | Build | npm run build --workspace frontend | PASS | Next.js 16.3.1, compile/typecheck/static generation PASS; routes /, /login, /signup, /onboarding |
| Backend | Typecheck | npm run typecheck --workspace backend | PASS | tsc --noEmit, exit 0 |
| Backend | Lint | npm run lint --workspace backend | PASS | eslint . --max-warnings=0, exit 0 |
| Backend | Test | npm run test --workspace backend | PASS | 52 test files PASS, 1 skipped; 376 tests PASS, 1 skipped |
| Backend | Build | npm run build --workspace backend | PASS | Next.js 16.3.1, compile/typecheck/static generation PASS |

Perbaikan yang menutup kegagalan awal:

- Generated database.types.ts dikonversi dari UTF-16LE menjadi UTF-8 sehingga Turbopack dapat membacanya.
- ESLint mengabaikan output generated/nested yang benar, lalu semua issue source aktual diperbaiki.
- Vitest tidak lagi mengambil tiga legacy node:test .mjs sebagai Vitest suite; suite TypeScript aktual tetap dijalankan.
- Auth client memiliki batas waktu deterministik, logout nyata, dan route onboarding ikut masuk production build.

#### B.2 Auth E2E

AUTH E2E: PASS

Browser smoke dilakukan melalui Chrome headless terhadap runtime localhost:3000 dan backend localhost:8080. Tidak ada token yang dicetak atau disimpan.

| Flow | Result | Evidence |
| --- | --- | --- |
| Guest → /login | PASS | Protected root mengarahkan guest ke login |
| Login valid | PASS | Fixture user berhasil login |
| Session persisted | PASS | Session tetap valid setelah reload |
| /api/auth/me works | PASS | HTTP 200 untuk session valid |
| Incomplete user → /onboarding | PASS | Redirect onboarding teramati sebelum fixture diselesaikan |
| 0 stakeholder modes | PASS | RPC menerima array kosong |
| UMKM mode | PASS | RPC dan UI menyimpan UMKM |
| Multi-mode | PASS | UMKM + INVESTOR tersimpan |
| Completed user → / | PASS | Login fixture completed diarahkan ke dashboard |
| Reload preserves session | PASS | Dashboard bertahan setelah reload |
| Logout clears session | PASS | Backend logout best-effort, local Supabase session dibersihkan, lalu redirect /login |

Fixture dikembalikan ke 0 stakeholder modes dan logout setelah smoke.

#### B.3 Security closure

| Check | Result | Evidence |
| --- | --- | --- |
| Raw survey response inaccessible to anon | PASS | Sebelum repair, anon HEAD survey_responses = 200; sesudah repair = 401 |
| Onboarding RPC works against remote schema | PASS | Sebelum repair gagal 42804 text-to-enum; sesudah repair flow 0/UMKM/multi PASS |
| Current tracked tree contains JWT-like token | PASS | Safe filename-only scan menemukan 0 match setelah redaction |
| Historical Git exposure | FAIL | Expired Supabase access JWT berisi PII pernah committed pada commit 0fb06bb dan terdapat pada origin/main serta origin/finalmerge |
| MAPID private value in current env/source | PASS | Tidak ada MAPID value pada local env; tracked template hanya nama variabel kosong |
| Private env ignored | PASS | Root, backend, dan frontend .env.local cocok dengan rule .env* |
| Runtime/log directory ignored | PASS | **/.sites-runtime/ sekarang di-ignore |

Token historis sudah expired pada 2026-08-20 dan empat salinan di current tree telah diganti [REDACTED_EXPIRED_ACCESS_TOKEN]. Git history belum di-rewrite karena rewrite remote history adalah tindakan destruktif dan membutuhkan koordinasi terpisah.

#### B.4 Migration closure

| Required result | Status | Evidence |
| --- | --- | --- |
| LOCAL MIGRATION HISTORY | FAIL | Fresh lexicographic replay dimulai dengan 0003 yang mereferensikan tabel sebelum tabel tersebut dibuat; chain aktif juga menciptakan user_role/profiles.role legacy. |
| REMOTE MIGRATION HISTORY | FAIL | Ledger versi saat ini cocok, tetapi schema linked tidak direpresentasikan secara reproducible oleh chain aktif. |
| LOCAL ↔ REMOTE CONSISTENCY | FAIL | Version ledger sama, tetapi current remote schema memakai account_role dan stakeholder_mode enum yang tidak dibentuk secara benar oleh active local chain. |
| REMOTE SCHEMA | FAIL | Runtime repair PASS, namun provenance/reproducibility schema terhadap migration source of truth FAIL. |

Read-only npx supabase migration list berhasil dan menunjukkan seluruh version aktif lokal sama dengan remote, termasuk 20260822194800 dan 20260822213000. CLI juga secara eksplisit melewati:

- ignore_0004_getra_foundation_upgrade.sql
- ignore_0005_getra_reference_seed.sql
- ignore_0006_getra_foundation_verify.sql
- ignore_20260820004519_add_data_quality_foundation.sql

Kesamaan ledger tidak menutup defect berikut:

1. 0003_getra_security_hotfix.sql dieksekusi sebelum migration timestamp yang membuat profiles, spatial_sources, study_areas, transport_corridors, transport_nodes, dan umkm_profiles. Fresh replay berhenti pada object yang belum ada.
2. 20260815205854_add_roles_to_profiles.sql menciptakan user_role berisi COMMUTER, UMKM, COMMUNITY, ADMIN dan profiles.role. Ini bertentangan dengan authorization USER/ADMIN yang terkunci.
3. Tidak ada active migration yang menciptakan canonical account_role, trust_score, atau schema remote onboarding secara utuh.
4. Linked type generation membuktikan remote memakai account_role USER/ADMIN, profiles.onboarding_complete, user_stakeholder_modes, dan stakeholder_mode. Active onboarding migration mencoba membuat mode sebagai text IF NOT EXISTS, sedangkan remote table aktual memakai enum; inilah sumber kegagalan 42804 sebelum repair.
5. File 0004/0005/0006 dan data-quality yang dahulu tracked sekarang berupa ignore_* sehingga tidak diproses Supabase. 0004 juga membawa app_role/profiles.app_role legacy sehingga tidak aman diterapkan buta.

Repair non-destruktif 20260822213000_phase4_security_and_onboarding_repair.sql telah diterapkan ke remote. Repair tersebut:

- Membatasi complete_onboarding ke authenticated dan service_role.
- Memvalidasi maksimal tiga mode dan whitelist UMKM/INVESTOR/GOVERNMENT.
- Kompatibel dengan kolom remote enum maupun local text tanpa menghidupkan role authorization legacy.
- Mencabut seluruh privilege survey_responses dari anon/authenticated.
- Mengganti policy respons survei dengan policy eksplisit TO service_role.

Tidak ada db reset, DROP, TRUNCATE, mass delete, atau rewrite migration history.

#### B.5 Existing MAPID Artifact Inventory

Repository diaudit sebelum discovery internet. Pencarian mencakup backend integration/module/API/scripts/env, frontend, tests, docs, deployment, mission/activity, Menu Go, Struk Go, Properti Go, Community, dan survey.

| File / group | Artifact | Purpose | Credential usage | Contract evidence | Status |
| --- | --- | --- | --- | --- | --- |
| backend/src/integrations/mapid/mapid.config.ts | Server config parser | Validasi HTTPS base URL, API key, timeout/retry | MAPID_API_KEY server-only | Tidak menentukan provider host/auth/path | PARTIAL |
| backend/src/integrations/mapid/mapid.client.ts | Generic read client | Same-origin URL guard, timeout, retry, JSON parsing | Injected auth strategy | Provider auth sengaja belum ditetapkan | PLACEHOLDER |
| backend/src/integrations/mapid/mapid.adapter.ts | Adapter shell | Fetch → validate → normalize | Melalui generic client | Tidak terhubung endpoint production | PLACEHOLDER |
| backend/src/integrations/mapid/mapid.schema.ts | Fixture schema | Contract GETRA_MAPID_TEST_FIXTURE_V1 | Tidak ada real credential | Synthetic test contract, bukan provider contract | PLACEHOLDER |
| backend/src/integrations/mapid/mapid.normalizer.ts | Fixture normalizer | Normalisasi fixture | Tidak ada | Fixture-only guard | PLACEHOLDER |
| backend/src/integrations/mapid/mapid.mapper.ts | Candidate mapper | Memetakan normalized fixture ke external record | Tidak ada | Bukan canonical MAPID mapping | PLACEHOLDER |
| backend/src/integrations/mapid/mapid.errors.ts | Internal error abstraction | Sanitized internal error codes/retry classification | Tidak mencetak credential | Bukan provider error contract | PARTIAL |
| backend/tests/fixtures/mapid/*.json | Synthetic fixtures | Valid/invalid/empty/duplicate tests | Tidak ada | Seluruh data berlabel TEST | PLACEHOLDER |
| backend/tests/unit/integrations/mapid/* | Unit tests | Config/client/fixture contract tests | Test credential saja | Tidak ada external network call | PLACEHOLDER |
| backend/tests/integration/integrations/mapid-fixture-flow.test.ts | Fixture pipeline test | End-to-end local fixture flow | Tidak ada | Synthetic only | PLACEHOLDER |
| docs/MAPID_ADAPTER_USAGE.txt | Handoff documentation | Menjelaskan fixture boundary dan server-only env | Nama env saja | Secara eksplisit melarang menganggap fixture sebagai production | DOCUMENTATION |
| docs/changes/PHASE_06_MAPID_ADAPTER_CHANGES.txt | Historical change note | Mencatat adapter scaffold yang sudah ada | Nama env saja | Bukan official provider evidence | DOCUMENTATION |
| .env.example | Blank server env template | MAPID_BASE_URL, MAPID_API_KEY, MAPID_TIMEOUT_MS | Value kosong | Tidak memverifikasi contract | PARTIAL |
| frontend/lib/mapid.ts | Public map style selector | Memilih public style atau fallback | NEXT_PUBLIC style URL; private query key ditolak | Bukan activity API | ACTIVE |
| frontend/components/getra-map.tsx | MapLibre UI | Memuat style/basemap dan demo merchant | Tidak memiliki provider API key | Bukan provider data contract | ACTIVE |
| deployment/env/README.txt, docker-compose.yml, docs deployment | Deployment references | Meneruskan server env name | Tidak ada value | Tidak memverifikasi contract | DOCUMENTATION |

Kesimpulan inventory:

- Existing adapter tidak di-rewrite.
- Scaffold sudah baik sebagai fail-closed fixture foundation, tetapi belum dapat disebut production MAPID adapter.
- Tidak ada route internal yang melakukan production MAPID activity fetch.
- Frontend style resource bukan MAPID Apps activity API. Activity data final harus tetap melalui GETRA backend.

#### B.6 Environment Variable Audit

| Variable | Used by | Side | Tracked | Secret | Current state | Status |
| --- | --- | --- | --- | --- | --- | --- |
| MAPID_BASE_URL | mapid.config.ts | Backend | Nama kosong pada .env.example | NO | Tidak ada local value | NOT VERIFIED |
| MAPID_API_KEY | mapid.config.ts | Backend | Nama kosong pada .env.example | YES | Tidak ada local value | NOT VERIFIED |
| MAPID_TIMEOUT_MS | mapid.config.ts | Backend | Nama kosong pada .env.example | NO | Tidak ada local value; default source 10000 ms | PASS |
| NEXT_PUBLIC_MAPID_STYLE_URL | frontend/lib/mapid.ts | Frontend | Source reference; tidak ada pada .env.example | NO, hanya jika URL benar-benar public | Tidak ada local value | PARTIALLY_VERIFIED |
| NEXT_PUBLIC_MAPID_STYLE_NAME | frontend/lib/mapid.ts | Frontend | Source reference; tidak ada pada .env.example | NO | Tidak ada local value; fallback name aktif | PARTIALLY_VERIFIED |
| GEO_MAPID_* | Tidak ada | Tidak ada | NO | NOT APPLICABLE | Tidak ditemukan | NOT APPLICABLE |
| MAPID_TOKEN | Tidak ada | Tidak ada | NO | YES | Tidak ditemukan | NOT APPLICABLE |
| NEXT_PUBLIC_MAPID_API_KEY / SECRET | Tidak ada | Frontend | NO | YES | Tidak ditemukan | PASS |

MAPID_API_KEY wajib backend-only. NEXT_PUBLIC_MAPID_STYLE_URL hanya boleh berisi resource yang provider dokumentasikan sebagai public. Guard frontend menolak HTTP scheme selain http/https dan parameter query bernama api_key, api-key, apikey, access_token, token, authorization, atau secret. Karena public basemap contract belum diverifikasi, nilai tersebut tetap tidak dikonfigurasi.

### C. Official MAPID Sources

Sumber resmi/provider-first yang digunakan:

1. [MAPID API Documentation](https://mapid.co.id/docs/api-documentation?language=eng) — GEO layer Open API, lisensi, project/layer flow, GeoJSON.
2. [Complete MAPID Documentation](https://mapid.co.id/docs/download_all?language=eng) — indeks resmi data, form, sharing, Map Service API.
3. [MAPID Apps](https://mapid.co.id/mapid-apps) — product context.
4. [MAPID WebGIS Competition 2026](https://mapid.co.id/academy/webgis-competition) — official activity terminology, competition scope, data restrictions.
5. [Ketentuan Data & WebGIS](https://docs.google.com/document/d/1RiS49NJEBWeqE9s-Xw-hilo9x4ZSShm5oTdstDymn9I/edit?usp=sharing) — guide linked from official competition page; activity/mission field definitions and access handoff.
6. [MAPID Release Notes](https://mapid.co.id/releases) — Apps ↔ GEO integration and product capability evidence.
7. [Data Table Fields](https://mapid.co.id/docs/data-table-fields?language=eng) — form/database field types and audit metadata.
8. [Input Form](https://mapid.co.id/docs/input-form?language=eng) — location and media capture behavior.
9. [Form Response](https://mapid.co.id/docs/form-response?language=eng) — response rows inside project/layer table.
10. [Manage API Keys](https://mapid.co.id/docs/manage-api-keys?language=eng) and [Monitor Usage](https://mapid.co.id/docs/monitor-usage?language=eng) — Map Service API key management; not treated as Apps activity auth.
11. [MAPID Apps Privacy Policy](https://mapid.co.id/mapid_app/privacy) — privacy context.

Public docs retrieval from alphaserver.mapid.io was used only as APP_TRAFFIC_VERIFIED evidence for the official documentation application. It is not promoted to MAPID Apps API base URL.

Official competition guidance states that API access and documentation are provided to the 50 curated teams after curation. No such credential, copied Open API URL, project ID, layer ID, mission ID, or activity ID exists in the repository/environment available to this audit.

### D. API Base Contract

#### D.1 GEO MAPID per-layer Open API

| Contract item | Value | Verification |
| --- | --- | --- |
| Base URL | https://geoserver.mapid.io | OFFICIAL_DOC_VERIFIED |
| Method/path | GET /layers_new/get_layer | OFFICIAL_DOC_VERIFIED |
| Query | api_key, layer_id, project_id | OFFICIAL_DOC_VERIFIED |
| Authentication | API key in api_key query parameter copied from layer OPEN API | OFFICIAL_DOC_VERIFIED |
| Access prerequisite | Registered user with active GEO MAPID license and an existing project/layer | OFFICIAL_DOC_VERIFIED |
| API version | Example path has no version segment; formal version policy is not documented | NOT_VERIFIED |
| Response root | GeoJSON FeatureCollection with features | OFFICIAL_DOC_VERIFIED |
| Feature evidence | id, geometry, properties | OFFICIAL_DOC_VERIFIED |

The api_key query is a private credential for GETRA purposes. Even though the official copied URL carries it in the query, GETRA must call it only from backend/server tooling, redact query values, and never place the URL in frontend logs, reports, screenshots, analytics, or Git.

Sanitized structure visible in the official documentation screenshot:

    {
      "type": "FeatureCollection",
      "features": [
        {
          "id": "[REDACTED]",
          "geometry": {
            "type": "[REDACTED]",
            "coordinates": "[REDACTED]"
          },
          "properties": {
            "[provider-field]": "[REDACTED]"
          }
        }
      ]
    }

This is official documentation evidence, not a GETRA live response fixture.

#### D.2 MAPID Apps activity API

| Contract item | Value | Verification |
| --- | --- | --- |
| Production base URL | NOT VERIFIED | NOT_VERIFIED |
| Path/version | NOT VERIFIED | NOT_VERIFIED |
| Auth scheme/header/query | NOT VERIFIED | NOT_VERIFIED |
| Activity/mission endpoint | NOT VERIFIED | NOT_VERIFIED |
| Area capability | Official release/product evidence says area-based activity API exists; request contract absent | PARTIALLY_VERIFIED |
| Record envelope | NOT VERIFIED | NOT_VERIFIED |

The GEO layer endpoint is not evidence that MAPID Apps activities use the same host, path, auth, query model, or envelope.

#### D.3 Authentication details

| Item | GEO layer Open API | MAPID Apps activity API |
| --- | --- | --- |
| AUTH METHOD | Query API key | NOT VERIFIED |
| HEADER | NOT APPLICABLE for the documented GEO example | NOT VERIFIED |
| TOKEN TYPE | api_key value | NOT VERIFIED |
| TOKEN SOURCE | Layer editor → OPEN API copied URL | Documentation/credential handoff not available |
| EXPIRATION | NOT VERIFIED | NOT VERIFIED |
| REFRESH | NOT VERIFIED | NOT VERIFIED |
| SCOPE | Project/layer context implied by project_id/layer_id; authorization semantics NOT VERIFIED | NOT VERIFIED |

### E. Verified Read Request

#### E.1 Required provider read

| Request log item | Result |
| --- | --- |
| METHOD | NOT TESTED |
| URL PATH | NOT TESTED |
| AUTH METHOD | NOT TESTED |
| QUERY | NOT TESTED |
| HTTP STATUS | NOT TESTED |
| RESPONSE SHAPE | NOT TESTED |
| RECORD COUNT | NOT TESTED |
| PAGINATION | NOT TESTED |
| TIMESTAMP | 2026-08-22 Asia/Jakarta |
| RESULT | BLOCKED |

Reason: MAPID credential plus authorized project/layer/activity identifier tidak tersedia. Random ID, random auth header, brute-force endpoint, dan unauthorized provider probing tidak dilakukan.

GET terhadap public official documentation backend berhasil, tetapi tidak dihitung sebagai required MAPID/GEO data read. Official screenshot juga tidak dihitung sebagai request milik GETRA.

### F. Activity Matrix

| GETRA evidence type | Official MAPID term | Official ID | Endpoint | Geometry | Timestamp | Media | Pagination | Verified |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Menu | Menu Go mission | NOT VERIFIED | NOT VERIFIED | Latitude + Longitude field definitions | Tanggal + Waktu field definitions; wire format/timezone NOT VERIFIED | Foto tempat, dua foto menu, optional digital-menu link | NOT VERIFIED | PARTIALLY_VERIFIED |
| Receipt | Struk Go mission | NOT VERIFIED | NOT VERIFIED | Latitude + Longitude documented as Text | Tanggal Transaksi + Waktu Transaksi documented as Text | Foto Struk/Bukti Bayar link | NOT VERIFIED | PARTIALLY_VERIFIED |
| Property | Properti Go mission | NOT VERIFIED | NOT VERIFIED | Latitude + Longitude decimal definitions | Tanggal field definition | Foto Tampak Depan + Foto Spanduk/Papan Promosi | NOT VERIFIED | PARTIALLY_VERIFIED |
| Community | Community Maps activity | NOT VERIFIED | NOT VERIFIED | latitude + longitude decimal fields | No timestamp in competition field table | medias, images, videos links | NOT VERIFIED | PARTIALLY_VERIFIED |
| Survey | MAPID Apps survey activities / GEO Form responses | Form/layer/record IDs NOT VERIFIED | NOT VERIFIED | Form location point and lat/long capabilities documented | Date/time and Last Edited field types exist; API semantics NOT VERIFIED | Image/document field types and photo capture documented | NOT VERIFIED | PARTIALLY_VERIFIED |

Terminology verified from official guidance:

- Community Maps data is called activity data.
- Properti Go, Struk Go, and Menu Go are data mission datasets.
- Custom field survey data is collected through MAPID Apps mission/activities and managed in GEO project/layer/form context.

No official mission/activity identifier was disclosed in the public material.

### G. Field Contracts

Required and nullable semantics below are NOT VERIFIED unless explicitly stated. These are provider labels/field definitions, not final JSON property names and not canonical GETRA mappings.

#### G.1 Community Maps Activity

| Provider field | Type | Meaning | Required / nullable | Redacted example | Candidate GETRA meaning | Confidence | Verification |
| --- | --- | --- | --- | --- | --- | --- | --- |
| title | Text | Judul activity | NOT VERIFIED | [REDACTED] | Evidence title | HIGH | OFFICIAL_DOC_VERIFIED |
| description | Text | Deskripsi activity | NOT VERIFIED | [REDACTED] | Evidence narrative | HIGH | OFFICIAL_DOC_VERIFIED |
| latitude | Decimal | Lintang lokasi | NOT VERIFIED | [REDACTED] | Source latitude | HIGH | OFFICIAL_DOC_VERIFIED |
| longitude | Decimal | Bujur lokasi | NOT VERIFIED | [REDACTED] | Source longitude | HIGH | OFFICIAL_DOC_VERIFIED |
| medias | Link | Beberapa foto/video dipisah koma | NOT VERIFIED | [REDACTED-URL] | Raw media references | MEDIUM | OFFICIAL_DOC_VERIFIED |
| images | Link | Tautan gambar | NOT VERIFIED | [REDACTED-URL] | Raw image reference | HIGH | OFFICIAL_DOC_VERIFIED |
| videos | Link | Tautan video | NOT VERIFIED | [REDACTED-URL] | Raw video reference | HIGH | OFFICIAL_DOC_VERIFIED |

#### G.2 Properti Go

| Provider field label | Documented type/options | Meaning | Required / nullable | Candidate GETRA meaning | Confidence | Verification |
| --- | --- | --- | --- | --- | --- | --- |
| Kategori Properti | Dropdown: Rumah, Kantor, Gudang, Restoran, Coworking Space, Ruko, Laundry, Coffee Shop, Minimarket, Retail F&B, Hotel, Retail, Tanah, Kos | Kategori properti | NOT VERIFIED | Property category evidence | HIGH | OFFICIAL_DOC_VERIFIED |
| Jenis Properti | Dropdown: Sewa, Jual | Offering type | NOT VERIFIED | Listing transaction type | HIGH | OFFICIAL_DOC_VERIFIED |
| Tanggal | Date | Tanggal pencatatan | NOT VERIFIED | Captured date candidate | MEDIUM | OFFICIAL_DOC_VERIFIED |
| Alamat | Text | Alamat properti | NOT VERIFIED | Source address | HIGH | OFFICIAL_DOC_VERIFIED |
| Foto Tampak Depan | Image link | Foto depan | NOT VERIFIED | Property evidence media | HIGH | OFFICIAL_DOC_VERIFIED |
| Foto Spanduk/Papan Promosi | Image link | Foto promosi | NOT VERIFIED | Listing evidence media | HIGH | OFFICIAL_DOC_VERIFIED |
| Latitude | Decimal | Lintang | NOT VERIFIED | Source latitude | HIGH | OFFICIAL_DOC_VERIFIED |
| Longitude | Decimal | Bujur | NOT VERIFIED | Source longitude | HIGH | OFFICIAL_DOC_VERIFIED |

#### G.3 Struk Go

| Provider field label | Documented type/options | Meaning | Required / nullable | Candidate GETRA meaning | Confidence | Verification |
| --- | --- | --- | --- | --- | --- | --- |
| Nama Tempat/Merchant | Text | Merchant transaksi | NOT VERIFIED | Merchant source name | HIGH | OFFICIAL_DOC_VERIFIED |
| Kategori Tempat | Dropdown: Restoran/kafe, Warung/kaki lima, Minimarket/supermarket, Apotek, Transportasi, Lainnya | Kategori tempat | NOT VERIFIED | Merchant category evidence | HIGH | OFFICIAL_DOC_VERIFIED |
| Tanggal Transaksi | Text | Tanggal transaksi | NOT VERIFIED | Transaction date candidate | MEDIUM | OFFICIAL_DOC_VERIFIED |
| Waktu Transaksi | Text | Waktu transaksi | NOT VERIFIED | Transaction time candidate | MEDIUM | OFFICIAL_DOC_VERIFIED |
| Metode Pembayaran | Dropdown: Tunai, QRIS, Debit, Kartu Kredit, E-wallet | Cara bayar | NOT VERIFIED | Payment evidence | HIGH | OFFICIAL_DOC_VERIFIED |
| Foto Struk/Bukti Bayar | Image link | Receipt/payment proof | NOT VERIFIED | Sensitive evidence media | HIGH | OFFICIAL_DOC_VERIFIED |
| Latitude | Text | Lintang | NOT VERIFIED | Source latitude after validation | MEDIUM | OFFICIAL_DOC_VERIFIED |
| Longitude | Text | Bujur | NOT VERIFIED | Source longitude after validation | MEDIUM | OFFICIAL_DOC_VERIFIED |

Total, item, dan item price tidak tercantum pada official field table yang ditemukan. Field tersebut tetap NOT VERIFIED dan tidak boleh diasumsikan tersedia.

#### G.4 Menu Go

| Provider field label | Documented type/options | Meaning | Required / nullable | Candidate GETRA meaning | Confidence | Verification |
| --- | --- | --- | --- | --- | --- | --- |
| Nama Tempat/Makan | Text | Nama tempat makan | NOT VERIFIED | Merchant source name | HIGH | OFFICIAL_DOC_VERIFIED |
| Jenis Tempat Makan | Dropdown: Restoran, Kaki Lima/Gerobak, Kafe, Warung/Tenda, Fast Food | Jenis tempat | NOT VERIFIED | Merchant category evidence | HIGH | OFFICIAL_DOC_VERIFIED |
| Tanggal | Text | Tanggal pencatatan | NOT VERIFIED | Captured date candidate | MEDIUM | OFFICIAL_DOC_VERIFIED |
| Waktu | Text | Waktu pencatatan | NOT VERIFIED | Captured time candidate | MEDIUM | OFFICIAL_DOC_VERIFIED |
| Foto Tempat | Photo link | Foto lokasi | NOT VERIFIED | Merchant evidence media | HIGH | OFFICIAL_DOC_VERIFIED |
| Foto Menu 1 | Photo link | Menu utama | NOT VERIFIED | Menu evidence media | HIGH | OFFICIAL_DOC_VERIFIED |
| Foto Menu 2 | Photo link | Menu lainnya | NOT VERIFIED | Menu evidence media | HIGH | OFFICIAL_DOC_VERIFIED |
| Menu Dalam Bentuk Link Digital | Optional Text | Digital menu URL | Optional in guide; null representation NOT VERIFIED | Merchant menu reference | HIGH | OFFICIAL_DOC_VERIFIED |
| Apa Menu Utama/Andalan Yang Dijual? | Text | Main menu | NOT VERIFIED | Menu evidence text | HIGH | OFFICIAL_DOC_VERIFIED |
| Berapa Harga Rata-rata Menu Tersebut? | Number | Average price per portion | NOT VERIFIED | Price evidence | HIGH | OFFICIAL_DOC_VERIFIED |
| Kondisi Pembeli Saat Kunjungan | Dropdown: Sepi, Sedang, Ramai | Observed demand | NOT VERIFIED | Demand observation | MEDIUM | OFFICIAL_DOC_VERIFIED |
| Mobilitas | Dropdown: Ya/Berkeliling, Tidak/Menetap | Mobile/fixed seller | NOT VERIFIED | Merchant mobility evidence | HIGH | OFFICIAL_DOC_VERIFIED |
| Latitude | Decimal | Lintang | NOT VERIFIED | Source latitude | HIGH | OFFICIAL_DOC_VERIFIED |
| Longitude | Decimal | Bujur | NOT VERIFIED | Source longitude | HIGH | OFFICIAL_DOC_VERIFIED |

#### G.5 Survey / Form

Official GEO docs verify these form capabilities, not their API JSON names:

| Capability | Official meaning | API field name/type/nullability | Candidate GETRA meaning | Confidence | Verification |
| --- | --- | --- | --- | --- | --- |
| Text / Long Description | Short text and field notes | NOT VERIFIED | Survey answer text | MEDIUM | OFFICIAL_DOC_VERIFIED |
| Selection / Button / Checklist | Controlled answers | NOT VERIFIED | Survey categorical answers | MEDIUM | OFFICIAL_DOC_VERIFIED |
| Number / Currency | Numeric input | NOT VERIFIED | Survey numeric answer | MEDIUM | OFFICIAL_DOC_VERIFIED |
| Location / Longitude / Latitude | Survey location | NOT VERIFIED | Source geometry inputs | MEDIUM | OFFICIAL_DOC_VERIFIED |
| Image / Document | Uploaded evidence | NOT VERIFIED | Survey media | MEDIUM | OFFICIAL_DOC_VERIFIED |
| Year / Date / Time | Temporal input | NOT VERIFIED | Captured/answer time candidate | LOW | OFFICIAL_DOC_VERIFIED |
| User Name | Collector metadata | NOT VERIFIED | Restricted provenance candidate | LOW | OFFICIAL_DOC_VERIFIED |
| ID Data | Unique row identifier | Exposure and stability NOT VERIFIED | Dedup candidate | MEDIUM | OFFICIAL_DOC_VERIFIED |
| Last Edited / Edited By | Audit metadata | API exposure/format NOT VERIFIED | Incremental/provenance candidate | MEDIUM | OFFICIAL_DOC_VERIFIED |

Question IDs, stable labels, submission IDs, form IDs, answer envelope, and required/null representation remain NOT VERIFIED.

### H. Geometry

| Item | Contract | Verification |
| --- | --- | --- |
| GEO layer format | GeoJSON FeatureCollection; feature geometry object | OFFICIAL_DOC_VERIFIED |
| Mission/activity field format | Separate latitude and longitude field definitions | OFFICIAL_DOC_VERIFIED |
| API wire representation for Apps | NOT VERIFIED | NOT_VERIFIED |
| Coordinate order | NOT VERIFIED; [longitude, latitude] is not asserted without real response/provider statement | NOT_VERIFIED |
| CRS | NOT VERIFIED | NOT_VERIFIED |
| Nullability | NOT VERIFIED | NOT_VERIFIED |
| Supported geometry types | Official docs mention simple marker through complex layer, but per-endpoint allowed types are NOT VERIFIED | PARTIALLY_VERIFIED |

No coordinate conversion was implemented during Phase 5.

### I. Pagination, Filters, Sorting, and Limits

#### I.1 Pagination matrix

| Endpoint | Pagination type | Parameters | Page size | Next mechanism | Verified |
| --- | --- | --- | --- | --- | --- |
| GEO /layers_new/get_layer | NOT VERIFIED | NOT VERIFIED | NOT VERIFIED | NOT VERIFIED | NOT_VERIFIED |
| MAPID Apps activity API | NOT VERIFIED | NOT VERIFIED | NOT VERIFIED | NOT VERIFIED | NOT_VERIFIED |
| Survey/Form response API | NOT VERIFIED | NOT VERIFIED | NOT VERIFIED | NOT VERIFIED | NOT_VERIFIED |

The documented GEO example does not display pagination parameters. This does not prove pagination is absent.

#### I.2 Filter matrix

| Endpoint | Mission filter | Date filter | BBOX | Radius | Other | Verified |
| --- | --- | --- | --- | --- | --- | --- |
| GEO /layers_new/get_layer | NOT VERIFIED | NOT VERIFIED | NOT VERIFIED | NOT VERIFIED | project_id and layer_id | OFFICIAL_DOC_VERIFIED for project/layer only |
| MAPID Apps activity API | Identifier/parameter NOT VERIFIED | NOT VERIFIED | Parameter contract NOT VERIFIED | NOT VERIFIED | Product-level area capability exists | PARTIALLY_VERIFIED |
| Survey/Form response API | NOT VERIFIED | NOT VERIFIED | NOT VERIFIED | NOT VERIFIED | form/project/layer relationship documented at UI level only | PARTIALLY_VERIFIED |

Default sorting/order, maximum request size, maximum page size, date-range restriction, BBOX size, mission scope, user scope, and media limits are all NOT VERIFIED.

### J. Temporal / Incremental Sync

| Item | Result |
| --- | --- |
| CREATED FIELD | Mission Tanggal/Waktu labels exist; canonical provider created/submitted field is NOT VERIFIED |
| UPDATED FIELD | Generic GEO Last Edited type exists; Apps API exposure is NOT VERIFIED |
| CAPTURED FIELD | Mission date/time field definitions exist; semantics are NOT VERIFIED |
| TIME FORMAT | Properti uses Date; Struk/Menu guidance labels date/time as Text; exact wire format NOT VERIFIED |
| TIMEZONE | NOT VERIFIED |
| DEFAULT ORDER | NOT VERIFIED |
| INCREMENTAL FILTER | NOT VERIFIED |
| CURSOR | NOT VERIFIED |
| CHANGE FEED | NOT VERIFIED |
| VERSION / ETAG | NOT VERIFIED |
| DELETE / TOMBSTONE SEMANTICS | NOT VERIFIED |

Without stable update semantics, Phase 6 cannot select a safe incremental strategy.

### K. Media

#### K.1 Media matrix

| Activity | Media field | Media ID | URL type | Auth needed | Expiry | Verified |
| --- | --- | --- | --- | --- | --- | --- |
| Community | medias, images, videos | NOT VERIFIED | Link; medias may contain comma-separated values | NOT VERIFIED | NOT VERIFIED | OFFICIAL_DOC_VERIFIED for field definition only |
| Properti Go | Foto Tampak Depan, Foto Spanduk/Papan Promosi | NOT VERIFIED | Image link | NOT VERIFIED | NOT VERIFIED | OFFICIAL_DOC_VERIFIED for field definition only |
| Struk Go | Foto Struk/Bukti Bayar | NOT VERIFIED | Image link | NOT VERIFIED | NOT VERIFIED | OFFICIAL_DOC_VERIFIED for field definition only |
| Menu Go | Foto Tempat, Foto Menu 1, Foto Menu 2, digital-menu link | NOT VERIFIED | Photo/text link | NOT VERIFIED | NOT VERIFIED | OFFICIAL_DOC_VERIFIED for field definition only |
| Survey/Form | Image and Document types | NOT VERIFIED | Upload reference representation NOT VERIFIED | NOT VERIFIED | NOT VERIFIED | PARTIALLY_VERIFIED |

Public, signed, temporary, authenticated, thumbnail/original, MIME type, dimensions, checksum, and token-refresh semantics are NOT VERIFIED. Phase 6 must not forward a provider secret to frontend to resolve media.

### Supporting Contract Matrices

#### Response envelope

| Source | Envelope | Verification |
| --- | --- | --- |
| GEO layer Open API screenshot | GeoJSON FeatureCollection → features[] → id/geometry/properties | OFFICIAL_DOC_VERIFIED |
| MAPID Apps activity | NOT VERIFIED | NOT_VERIFIED |
| Survey/Form API | NOT VERIFIED | NOT_VERIFIED |

No provider raw response was stored in Git.

#### Auth matrix

| Environment | Base URL | Auth scheme | Header/mechanism | Scope | Verified |
| --- | --- | --- | --- | --- | --- |
| GEO MAPID layer production | https://geoserver.mapid.io | API key | api_key query | Active license plus project/layer context; detailed scope NOT VERIFIED | OFFICIAL_DOC_VERIFIED |
| MAPID Apps activity production | NOT VERIFIED | NOT VERIFIED | NOT VERIFIED | NOT VERIFIED | NOT_VERIFIED |
| Official docs application | https://alphaserver.mapid.io | Public docs read used without credential | Public GET for documentation object | Documentation only | APP_TRAFFIC_VERIFIED |

The docs application host is excluded from the provider activity contract.

#### Error matrix

| Scenario | HTTP status | Provider code | Shape | Retryable | Verified |
| --- | --- | --- | --- | --- | --- |
| Valid GEO data request by GETRA | NOT TESTED | NOT VERIFIED | NOT VERIFIED | NOT VERIFIED | NOT TESTED |
| Missing/invalid credential | NOT TESTED | NOT VERIFIED | NOT VERIFIED | NOT VERIFIED | NOT TESTED |
| Invalid project/layer/activity parameter | NOT TESTED | NOT VERIFIED | NOT VERIFIED | NOT VERIFIED | NOT TESTED |
| Rate limited | NOT TESTED | NOT VERIFIED | NOT VERIFIED | NOT VERIFIED | NOT TESTED |

MAPID_UNAUTHORIZED, MAPID_FORBIDDEN, MAPID_RATE_LIMITED, and other names in GETRA source are internal adapter abstractions tested with synthetic HTTP fixtures. They are not evidence of provider codes or provider response bodies.

#### Rate limit

| Item | Result |
| --- | --- |
| RATE LIMIT | NOT VERIFIED |
| X-RateLimit headers | NOT VERIFIED |
| Retry-After | NOT VERIFIED |
| HTTP 429 contract | NOT VERIFIED |
| Quota/window | NOT VERIFIED |
| Official usage monitor applicability to layer/activity API | NOT VERIFIED |

No absence of documentation is interpreted as unlimited access.

### L. Provenance Inputs

#### L.1 Provenance candidates

| Candidate | Availability | Stability/exposure | Use in future |
| --- | --- | --- | --- |
| Provider = MAPID | Available as integration identity | Stable GETRA constant | Source namespace |
| project_id | GEO query contract | Value/access unavailable; stability NOT VERIFIED | Source project context |
| layer_id | GEO query contract | Value/access unavailable; stability NOT VERIFIED | Source layer context |
| features[].id | GEO response shape | Stability NOT VERIFIED | External record ID candidate |
| geometry | GEO response shape | Mutable/nullability NOT VERIFIED | Source geometry evidence |
| properties | GEO response shape | Schema varies by layer | Raw provider attributes |
| Activity/mission name | Official terminology | Official numeric/string ID NOT VERIFIED | Source activity context |
| Generic ID Data | Official GEO field type | API exposure/stability NOT VERIFIED | Submission dedup candidate |
| User Name / Edited By | Official generic metadata type | Personal; API exposure/permission NOT VERIFIED | Restricted audit metadata only |
| Last Edited | Official generic metadata type | Format/timezone/API exposure NOT VERIFIED | Incremental candidate |
| Media link | Official field definition | Media ID, lifetime, and auth NOT VERIFIED | Media provenance candidate |

### M. Deduplication / Idempotency Inputs

#### M.1 Candidate key classification

| Candidate key | Classification | Reason |
| --- | --- | --- |
| project_id + layer_id + feature.id | NOT VERIFIED | Components exist in GEO docs, but feature ID stability/reuse/update semantics are undocumented |
| mission/activity ID + submission ID | NOT VERIFIED | IDs and response fields are unavailable |
| generic Form ID Data | NOT VERIFIED | Described as unique row ID, but API exposure and lifecycle are unavailable |
| media URL | NOT_STABLE | URL lifetime/auth are unavailable; URL alone must not be treated as permanent identity |
| title/name + coordinates | NOT_STABLE | Mutable, non-unique, and privacy-sensitive |

No deduplication or idempotency code was implemented. Phase 6 needs stable IDs plus updated/version semantics or a documented snapshot reconciliation strategy.

### N. Privacy & Security

| Control | Result | Evidence / requirement |
| --- | --- | --- |
| MAPID credential server-only policy | PASS | Private env names exist only in backend config/template |
| Actual MAPID credential available | NOT APPLICABLE | No value supplied |
| Frontend private credential exposure | PASS | No NEXT_PUBLIC API key/secret; style guard rejects credential-like query parameters |
| Frontend raw Apps activity call | PASS | No activity API call exists |
| Backend URL/request logs | PASS | Existing adapter uses sanitized internal errors; frontend full URL/style logs removed |
| Popup content injection | PASS | setHTML replaced with DOM textContent/setDOMContent |
| Current Git secret exposure | PASS | JWT-like scan 0; MAPID values absent |
| Historical Git secret/PII exposure | FAIL | Expired Supabase JWT remains in remote Git history |
| Raw survey response exposure | PASS | anon/authenticated privileges removed; service_role-only policy applied |
| Raw MAPID response committed | PASS | No live response acquired or stored |

#### N.1 Data classification

| Data | Classification | Handling |
| --- | --- | --- |
| Community activity raw data | PROJECT_INTERNAL | Official competition rules prohibit raw redistribution/out-of-competition use without permission |
| Exact activity coordinates | PROJECT_INTERNAL; can become SENSITIVE | Minimize precision/exposure where user/home association exists |
| Contributor/User Name/Edited By | PERSONAL | Import only with explicit need and permission |
| Receipt photo | SENSITIVE | Can expose transaction, payment, merchant, date/time, and personal details |
| Property address/photos | PROJECT_INTERNAL; can contain PERSONAL data | Store/access only within authorized scope |
| Menu/merchant photos | PROJECT_INTERNAL | Respect copyright, face/plate/person redaction needs |
| Signed/private media URL | SENSITIVE | Never log or expose token; lifetime/auth NOT VERIFIED |

The official competition guide prohibits spreading raw MAPID/partner data externally and prohibits collection of sensitive personal data without permission. A successful authorized API response would therefore still require field minimization, access control, retention policy, and sanitized fixtures.

### O. Explicit Unknowns

NOT VERIFIED:

- MAPID Apps activity production base URL.
- Activity API version/path/auth scheme/header/query.
- Credential scope, expiry, refresh, revocation, and rate-limit quota.
- Official Menu Go, Struk Go, Properti Go, Community Activity, and custom survey IDs.
- Activity record/submission/user/media IDs and their stability.
- Exact activity response envelope and JSON property names.
- Required fields, null representation, enum wire values, and schema version.
- Apps geometry wire format, coordinate order, CRS, and nullability.
- Area/BBOX/radius/date/mission filter parameter names and limits.
- Pagination type, parameters, maximum size, next mechanism, total count.
- Default sorting and deterministic order.
- Created/submitted/updated timestamp names, formats, and timezone.
- Incremental filters, cursor, change feed, version, and ETag.
- Media public/signed/private status, auth, expiry, thumbnail/original variants, and media IDs.
- Provider success/error bodies, provider error codes, retryability, and Retry-After.
- Deletion, archive, hidden, update, and tombstone semantics.
- Whether GEO layer Open API is an authorized delivery mechanism for competition MAPID Apps datasets.
- Whether project access supplies a copied Open API URL, a distinct Apps area API, files, or more than one delivery path.

Critical blockers are not hidden by the partial official field discovery.

### P. Phase 6 Adapter Recommendation — Document Only

Existing backend/src/integrations/mapid foundation should be reused. Do not replace it with a guessed client.

Recommended Phase 6 module boundaries after official handoff:

1. config/auth
   - Backend-only credential loading.
   - Exact official query/header strategy.
   - URL/query redaction and host allowlist.
2. client
   - Read-only GET transport, timeout, bounded retry, abort, content-type/size checks.
   - Never log copied Open API URL with api_key.
3. activities
   - Explicit endpoint functions for the verified delivery contract.
   - Project/layer/activity identifiers from controlled config, never user-supplied arbitrary paths.
4. schemas/types
   - Versioned Zod schemas from sanitized live responses.
   - Separate raw provider field names from GETRA canonical fields.
5. pagination
   - Implement only the verified provider mechanism.
   - Persist cursor/watermark only after stability is proven.
6. media
   - Metadata-first, backend mediation where auth is required, URL/token redaction.
7. provenance
   - provider, project/layer/activity, external record ID, source timestamps, payload hash/schema version.
8. errors/observability
   - Translate provider status/body to sanitized GETRA errors.
   - Metrics without credential, PII, coordinate, or signed-media leakage.

Future flow:

    MAPID API
      ↓
    GETRA MAPID adapter
      ↓
    RAW / STAGING
      ↓
    Validation
      ↓
    Normalization
      ↓
    Deduplication
      ↓
    Canonical GETRA

This flow is a recommendation only. No production adapter endpoint, staging table, job, scheduler, normalization, deduplication, canonical mapping, media downloader, or sync was implemented in Phase 5.

### Q. Database

| Item | Result |
| --- | --- |
| MAPID SCHEMA CHANGE | NOT APPLICABLE |
| MAPID DATA INSERTED | NO |
| MAPID DESTRUCTIVE CHANGE | NOT APPLICABLE |
| MAPID WRITE REQUEST | NO |
| PRODUCTION INGESTION | NOT APPLICABLE |
| PHASE 4 REPAIR MIGRATION | PASS |

The only remote database mutation in this execution was the non-destructive Phase 4 closure repair 20260822213000 described in section B. It did not create MAPID tables or insert MAPID data.

### R. Source Changes

Phase 4 closure and security repairs:

- .gitignore — nested runtime/log ignore rules.
- eslint.config.mjs — correct generated output ignores.
- backend/vitest.config.mts — actual Vitest suite boundary.
- backend/src/types/database.types.ts — UTF-8 repair while preserving linked schema types.
- backend/app/api/onboarding/route.ts — lint cleanup.
- backend/scripts/docs/generate-final-pdf.ts — lint cleanup.
- backend/supabase/migrations/20260822213000_phase4_security_and_onboarding_repair.sql — onboarding and survey access repair.
- frontend/src/lib/auth-client.ts — auth timeout and lint cleanup.
- frontend/components/getra-dashboard.tsx and frontend/app/globals.css — real logout flow/UI.
- Four docs/final-source files — expired historical JWT redacted in current tree.

Phase 5 hardening/documentation:

- frontend/lib/mapid.ts — public-style URL validation and credential-like query rejection.
- frontend/components/getra-map.tsx — removed full style/error logs and replaced HTML popup interpolation with safe DOM text.
- docs/Integration_Phase_5_Final_Report.md — this report.

Existing adapter scaffold, synthetic fixtures, ignored legacy migration copies, and docs/Integration_Phase_6_Final_Report.md were audited but not implemented or advanced as Phase 6 work.

Final source verification:

| Check | Result |
| --- | --- |
| git diff --check | PASS after whitespace cleanup |
| JWT-like current tracked scan | PASS |
| Sensitive credential-query literal current tracked scan | PASS |
| Backend quality gates | PASS |
| Frontend quality gates | PASS; test NOT APPLICABLE |

### S. Phase 6 Gate

Phase 6 target: MAPID Activity Ingestion

PHASE 6 READINESS: NOT READY

| Minimum gate | Status | Evidence |
| --- | --- | --- |
| Official activity base URL verified | BLOCKED | GEO layer base is verified, Apps activity base is not |
| Authentication verified | BLOCKED | GEO layer query-key is known; activity API auth is not |
| At least one authorized live read PASS | BLOCKED | Credential and authorized identifiers unavailable |
| Record ID understood | BLOCKED | Generic GEO feature.id only; activity ID stability unavailable |
| Response envelope understood | BLOCKED | GEO layer only; Apps activity envelope unavailable |
| Pagination understood or proven absent | BLOCKED | Neither condition met |
| Geometry representation understood | BLOCKED | Official field definitions exist; activity API wire/CRS/order unavailable |
| Timestamp semantics understood | BLOCKED | Labels exist; wire format/timezone/update semantics unavailable |
| Credential server-only | PASS | Policy/source boundary enforced |
| No critical unresolved contract blocker | FAIL | Multiple critical items remain |
| No provider write performed | PASS | No MAPID provider write |
| No production ingestion implemented | PASS | Discovery-only boundary preserved |

Phase 5 completion checklist:

| Criterion | Status |
| --- | --- |
| Phase 4 closure gate PASS | FAIL |
| Existing MAPID artifacts audited | PASS |
| Official source identified | PASS |
| GEO layer base/auth documented | PASS |
| MAPID Apps base/auth documented | BLOCKED |
| Activity terminology investigated | PASS |
| Menu Go investigated | PASS |
| Struk Go investigated | PASS |
| Properti Go investigated | PASS |
| Community Activity investigated | PASS |
| Survey/Form investigated | PASS |
| Activity record IDs identified | BLOCKED |
| Activity geometry contract identified | BLOCKED |
| Timestamp contract identified | BLOCKED |
| Media investigated | PASS |
| Pagination investigated | PASS; result NOT VERIFIED |
| Area/BBOX capability investigated | PASS; contract NOT VERIFIED |
| Incremental sync investigated | PASS; result NOT VERIFIED |
| Error contract investigated | PASS; result NOT VERIFIED |
| Rate limit investigated | PASS; result NOT VERIFIED |
| One real authorized read PASS | BLOCKED |
| Credential remains server-only | PASS |
| No provider write | PASS |
| No production ingestion | PASS |
| No invented contract | PASS |
| Final documentation completed | PASS |

Required handoff to unblock Phase 5:

1. Organizer-provided official API documentation for the curated GETRA team.
2. Backend-only credential or copied Open API URL delivered through an approved secret channel.
3. Authorized project_id/layer_id or official activity/mission identifiers for a non-sensitive target.
4. Permission/scope statement covering GETRA use, retention, and publication restrictions.
5. One safe read window so GETRA can record sanitized status, envelope, count, pagination, IDs, geometry, timestamps, media metadata, and error/rate-limit headers.

Until that handoff exists:

PHASE 5: BLOCKED

PHASE 6 READINESS: NOT READY

STOP — Integration Phase 6 has not been started.
