# GETRA / WebGIS — Progress Handoff & Continuation Checklist

> **Project:** GETRA — Geo-Enabled Transit & Retail Analytics  
> **Repo:** `C:\Users\Revan Anthony\OneDrive\Documents\GitHub\webgis`  
> **Branch integrasi:** `finalmerge`  
> **Checkpoint:** 22 Agustus 2026  
> **Independent verification update:** 27 Agustus 2026. Older DONE claims are historical context, not current evidence. Phase 2 found and repaired remaining legacy authorization policy gaps; fresh reset/RLS execution is still blocked until Docker/Supabase is available. Current release gates are `docs/SECURITY_REVIEW.md` and `docs/PRODUCTION_ACCEPTANCE_CHECKLIST.md`.
> **Tujuan:** memberi konteks ke anggota tim lain agar bisa melanjutkan progress tanpa mengulang keputusan arsitektur/migrasi yang sudah selesai.

## Legend

- [x] **DONE** — sudah diterapkan dan diverifikasi.
- [ ] **TODO** — belum diterapkan.
- [ ] **VERIFY** — belum cukup bukti untuk dianggap selesai.
- ⚠️ **CATATAN** — keputusan penting; jangan diubah tanpa audit.

---

# 0. Ringkasan kondisi project

## Repo / Git

- [x] Project sudah digabung ke branch `finalmerge`.
- [x] `finalmerge` sudah pernah di-push ke origin.
- [x] Konflik merge utama sudah diselesaikan.
- [x] Legacy auth role di database sudah dibersihkan.
- [x] Backend auth/profile sudah dimigrasikan ke model baru.
- [x] Login + Signup frontend tahap awal sudah diterapkan.
- [ ] Onboarding endpoint + UI **BELUM diterapkan**.
- [ ] Full `npm test`, `npm run lint`, dan `npm run build` setelah perubahan frontend auth terbaru **belum diverifikasi pada checkpoint ini**.

ZIP backup lokal yang jangan ikut repo:

```text
finalmerge.zip
finalmerge1.zip
```

Generated files yang sebelumnya direstore sebelum commit:

```text
public/maplibre/maplibre-gl-shared.mjs
public/maplibre/maplibre-gl-worker.mjs
tsconfig.tsbuildinfo
```

---

# 1. Arsitektur user yang sudah dikunci

## 1.1 Authorization account

- [x] Authorization hanya:

```text
USER
ADMIN
```

- [x] Disimpan di `public.profiles.account_role`.
- [x] Public signup selalu menjadi `USER`.
- [x] `ADMIN` tidak dipilih di public signup.
- [x] `ADMIN` hanya diberikan lewat proses trusted/internal.

### Model lama yang sudah ditinggalkan

```text
COMMUTER
UMKM
COMMUNITY
ADMIN
```

sebagai `user_role`, dan:

```text
USER
CONTRIBUTOR
UMKM_OWNER
MODERATOR
ADMIN
```

sebagai `app_role`.

## 1.2 General GETRA access

- [x] General/commuter functionality adalah baseline semua `USER`.
- [x] `COMMUTER` bukan role.
- [x] `COMMUTER` bukan stakeholder mode.
- [x] `COMMUNITY` bukan role.
- [x] Community diarahkan sebagai fitur sosial GETRA.

Contoh general access:

```text
Peta
Pencarian lokasi
UMKM / POI
Transportasi
Pedestrian / walking accessibility
Community
Eksplorasi kawasan
```

## 1.3 Optional stakeholder modes

- [x] Stakeholder mode dipisahkan dari authorization.
- [x] Tabel: `public.user_stakeholder_modes`.
- [x] Mode:

```text
UMKM
INVESTOR
GOVERNMENT
```

- [x] Satu user boleh punya lebih dari satu mode.
- [x] User boleh memiliki 0 mode dan tetap valid sebagai General GETRA user.

---

# 2. SUPABASE

## Stage S1 — Stakeholder mode migration

- [x] `public.user_stakeholder_modes` sudah dibuat.
- [x] Legacy user UMKM sudah dimigrasikan ke mode `UMKM`.
- [x] General user tidak dipaksa punya mode.
- [x] Signup/trigger sudah diarahkan ke `account_role = USER`.

### Hasil verifikasi

```json
[
  {"account_role":"USER","mode":"UMKM","total":2},
  {"account_role":"USER","mode":null,"total":2},
  {"account_role":"ADMIN","mode":null,"total":1}
]
```

Interpretasi:

```text
USER + UMKM = 2
USER general = 2
ADMIN = 1
```

## Stage S2 — Legacy DB role cleanup

- [x] `profiles.role` dihapus.
- [x] `profiles.app_role` dihapus.
- [x] enum `public.user_role` dihapus.
- [x] enum `public.app_role` dihapus.
- [x] `private.has_app_role()` dihapus.
- [x] `private.protect_profile_security_fields()` disederhanakan agar fokus ke `account_role`.
- [x] Cleanup dilakukan tanpa `CASCADE`.

### Audit final database

```json
{
  "has_account_role": true,
  "has_legacy_role": false,
  "has_legacy_app_role": false,
  "has_user_role_enum": false,
  "has_app_role_enum": false,
  "has_account_role_enum": true,
  "has_stakeholder_mode_enum": true,
  "has_legacy_has_app_role_function": false,
  "total_users": 4,
  "total_admins": 1,
  "total_umkm_modes": 2
}
```

⚠️ **Jangan menjalankan ulang cleanup migration ini.** Database sudah berada pada kondisi setelah cleanup.

## Stage S3 — Generated Supabase TypeScript types

- [ ] **VERIFY** apakah generated `Database` types sudah benar-benar diregenerate setelah kolom/enum legacy di-drop.

Cari dengan:

```bat
git grep -n "export type Database" -- "*.ts" "*.tsx"
```

Jika generated types masih lama, sinkronkan dengan schema Supabase terbaru.

---

# 3. BACKEND — Auth/Profile

## Stage B1 — Core auth/profile model

- [x] `src/schemas/auth.schema.ts` sudah tidak menerima public role selector.
- [x] `src/types/profile.ts` sudah memakai `account_role`.
- [x] `src/mappers/profile.mapper.ts` sudah memakai model profile baru.
- [x] `src/repositories/profile.repository.ts` sudah query canonical profile columns.
- [x] Filtering/count profile memakai `account_role`.
- [x] `src/services/profile.service.ts` mengikuti model baru.
- [x] `src/lib/auth.ts` mengikuti `USER | ADMIN`.

Canonical profile columns:

```text
id
display_name
avatar_url
account_role
trust_score
onboarding_complete
created_at
updated_at
```

## Stage B2 — Auth API

Sudah diubah:

```text
app/api/auth/login/route.ts
app/api/auth/register/route.ts
app/api/auth/me/route.ts
```

### Register

- [x] Public register tidak menerima `role`.
- [x] Public register tidak menerima `account_role`.
- [x] `display_name` dikirim sebagai user metadata.
- [x] Public user diarahkan ke:

```text
account_role = USER
onboarding_complete = false
```

### Login

- [x] Memakai `signInWithPassword()`.
- [x] Logging `supabaseCode` diperbaiki agar tidak `undefined`.
- [x] `profile.role` diganti menjadi `profile.account_role`.
- [x] Tahap frontend auth terbaru menyiapkan response session:

```text
access_token
refresh_token
expires_at
```

⚠️ Setelah penambahan `refresh_token`, yang terkonfirmasi hijau baru `npx tsc --noEmit`.

### `/api/auth/me`

- [x] Mengembalikan:

```text
display_name
avatar_url
account_role
onboarding_complete
trust_score
```

---

# 4. BACKEND — Profile API

Current endpoint:

```text
GET   /api/profile
PATCH /api/profile
```

`PATCH /api/profile` saat ini hanya menerima:

```text
display_name
avatar_url
```

- [x] Stakeholder onboarding **tidak** dipaksakan ke `/api/profile`.
- [ ] Akan dibuat endpoint khusus:

```text
GET  /api/onboarding
POST /api/onboarding
```

---

# 5. BACKEND — Endpoint policy

File:

```text
src/lib/api-security/endpoint-policy.ts
```

- [x] Auth/profile/spatial/admin endpoint existing sudah tercatat.
- [x] Endpoint-policy test pernah hijau.
- [ ] `/api/onboarding` belum ditambahkan.

Target policy nanti:

```text
GET  /api/onboarding → AUTHENTICATED / api
POST /api/onboarding → AUTHENTICATED / mutation
```

⚠️ Route baru tanpa policy dapat membuat endpoint-policy test gagal.

---

# 6. TESTS

## Stage T1 — Tests model auth baru

- [x] `tests/unit/profile-repository.test.ts` sudah dari `role` ke `account_role`.
- [x] `tests/unit/security/auth-guards.test.ts` memakai `AccountRole`.
- [x] `tests/integration/auth.test.ts` sudah diubah untuk:
  - signup tanpa role;
  - role injection → `VALIDATION_ERROR`;
  - login membaca `profile.account_role`.

Hasil yang pernah tercatat sebelum frontend auth session extension:

```text
Test Files  51 passed | 1 skipped
Tests       373 passed | 1 skipped
```

Sebelum perubahan frontend auth terbaru:

```text
TypeScript ✅
Tests      ✅
Lint       ✅
Build      ✅
```

## Stage T2 — Setelah session login ditambah refresh token

- [ ] Pastikan `tests/integration/auth.test.ts` expectation session sudah mengikuti:

```ts
{
  access_token: "...",
  refresh_token: "...",
  expires_at: ...
}
```

- [ ] Jalankan ulang:

```bat
npx tsc --noEmit
npm test
npm run lint
npm run build
```

Checkpoint terbaru hanya:

```text
npx tsc --noEmit ✅
```

---

# 7. DEV / SMOKE SCRIPTS

## `scripts/api-smoke-test.ts`

- [x] Auth role lama sudah dihilangkan dari model test user.
- [x] Fixture dibaca sebagai:

```text
GENERAL_USER_1 → USER
UMKM_USER      → USER
GENERAL_USER_2 → USER
ADMIN          → ADMIN
```

- [x] Script memverifikasi `account_role`.

## `scripts/auth-register-smoke-test.ts`

- [x] Positive signup tidak mengirim `role`.
- [x] `account_role = ADMIN` injection diuji sebagai invalid public request.
- [x] `role = COMMUTER` sengaja ada sebagai **negative test**.

## `scripts/provision-test-users.ts`

- [x] Tidak lagi menulis `profiles.role` / `public.user_role`.
- [x] Provisioning menggunakan Supabase Admin API.
- [x] Fixture target:

```text
getra.commuter.test@example.com → USER / General
getra.umkm.test@example.com     → USER / UMKM mode
getra.community.test@example.com→ USER / General
getra.admin.test@example.com    → ADMIN
```

## Exception: survey fixture

`COMMUTER` di:

```text
scripts/ingestion/phase-13/seed-dummy-surveys.ts
```

adalah nilai `preferred_transport_mode`, bukan authorization role.

- [x] Jangan dihapus hanya karena grep menemukannya.

---

# 8. FRONTEND — Dashboard existing

Files:

```text
app/page.tsx
components/getra-dashboard.tsx
components/getra-map.tsx
```

`app/page.tsx` masih merender:

```tsx
<GetraDashboard />
```

Dashboard sekarang masih banyak memakai:

```text
DEMO_MERCHANTS
PILOT_ORIGIN
synthetic data
```

- [x] Map UI sudah berjalan.
- [x] Zoom/compass MapLibre pernah terverifikasi.
- [x] Demo filtering masih aktif.
- [ ] Merchant synthetic belum diganti Supabase.
- [ ] Walking time dashboard belum memakai pedestrian network real.
- [ ] AI belum aktif.
- [ ] Community Activity / Menu Go belum tersambung ke dashboard.

## Stakeholder switch dashboard

UI masih menampilkan:

```text
Komuter
UMKM
Investor
Pemerintah
```

Ini **sudah tidak sesuai** model auth baru.

Target nanti:

```text
General
+
mode yang user miliki
```

Contoh:

```text
General | UMKM
```

atau:

```text
General
```

- [ ] Update setelah onboarding/session stabil.

---

# 9. FRONTEND — Browser auth/session

Browser client:

```text
src/lib/supabase/browser.ts
```

Server client:

```text
src/lib/supabase/server.ts
```

Server tetap stateless:

```text
autoRefreshToken: false
persistSession: false
detectSessionInUrl: false
```

Backend user requests memakai:

```text
Authorization: Bearer <access_token>
```

## Keputusan milestone

- [x] Tidak membongkar backend ke SSR-cookie auth saat ini.
- [x] Tidak menambah `@supabase/ssr` pada tahap ini.
- [x] Browser menyimpan Supabase session.
- [x] Backend GETRA tetap menerima Bearer token.

Flow target:

```text
Browser
  ↓
POST /api/auth/login
  ↓
access_token + refresh_token
  ↓
supabase.auth.setSession(...)
  ↓
browser session persistence
  ↓
GETRA API
Authorization: Bearer <access_token>
```

---

# 10. FRONTEND — Login & Signup

## Stage F3 — Auth UI

Sudah dibuat/diubah:

```text
src/lib/auth-client.ts
app/auth.module.css
app/login/page.tsx
app/signup/page.tsx
app/api/auth/login/route.ts
app/api/auth/register/route.ts
```

### `src/lib/auth-client.ts`

Digunakan untuk:

```text
persistAuthSession()
getAccessToken()
authenticatedFetch()
clearAuthSession()
```

### Login flow

```text
/login
   ↓
POST /api/auth/login
   ↓
persist session
   ↓
onboarding_complete?
├─ true  → /
└─ false → /onboarding
```

- [x] Login UI tahap awal sudah diterapkan.
- [x] `npx tsc --noEmit` setelah auth frontend dilaporkan hijau.
- [ ] Manual browser login end-to-end belum diuji karena `/onboarding` belum ada.

### Signup flow

```text
/signup
   ↓
POST /api/auth/register
   ↓
jika session tersedia
→ persist session
→ /onboarding

jika email confirmation aktif
→ pesan cek email
→ login setelah confirm
```

- [x] Signup UI tahap awal sudah diterapkan.
- [ ] Manual signup end-to-end belum diuji.

---

# 11. ONBOARDING — BELUM DITERAPKAN

> **Checkpoint berhenti di sini. SQL dan coding onboarding yang terakhir dibahas belum diterapkan.**

## Stage O1 — Supabase RPC

- [ ] Belum membuat:

```text
public.complete_onboarding(selected_modes stakeholder_mode[])
```

Tujuan function:

1. Ambil `auth.uid()`.
2. Validasi mode hanya `UMKM`, `INVESTOR`, `GOVERNMENT`.
3. Hapus stakeholder mode user sebelumnya.
4. Insert mode pilihan baru.
5. Set `profiles.onboarding_complete = true`.
6. Semuanya atomic dalam satu PostgreSQL function/transaction.

⚠️ SQL onboarding terakhir **belum dijalankan**.

## Stage O2 — Schema

- [ ] Buat:

```text
src/schemas/onboarding.schema.ts
```

Contract:

```ts
{
  modes: Array<"UMKM" | "INVESTOR" | "GOVERNMENT">
}
```

Rules:

```text
0–3 modes
unique
strict schema
```

## Stage O3 — API

- [ ] Buat:

```text
app/api/onboarding/route.ts
```

### GET

```text
read onboarding_complete
read current stakeholder modes
```

### POST

```text
call complete_onboarding(...)
return onboarding_complete + modes
```

## Stage O4 — Endpoint policy

- [ ] Tambahkan GET/POST `/api/onboarding` ke endpoint policy.

## Stage O5 — UI

- [ ] Buat:

```text
app/onboarding/onboarding.module.css
app/onboarding/page.tsx
```

Target UI:

```text
General access sudah aktif

Optional:
[ ] UMKM
[ ] Investor
[ ] Pemerintah
```

User boleh pilih 0–3 mode.

Jika 0 mode:

```text
General GETRA User
onboarding_complete = true
```

## Stage O6 — Tests

- [ ] Update login session expectation bila belum.
- [ ] Tambahkan test onboarding.
- [ ] Pastikan endpoint-policy test mencakup onboarding.

---

# 12. Quality Gate

Sebelum frontend auth terbaru:

```text
TypeScript ✅
Tests      ✅
Lint       ✅
Build      ✅
```

Setelah login/signup + session changes terbaru:

```text
TypeScript ✅
Tests      ⬜ belum diverifikasi ulang
Lint       ⬜ belum diverifikasi ulang
Build      ⬜ belum diverifikasi ulang
```

Wajib setelah onboarding:

```bat
npx tsc --noEmit
npm test
npm run lint
npm run build
```

---

# 13. NEXT CONTINUATION — Urutan untuk teman

## Stage NEXT-1 — Check working tree

- [ ] `git status`
- [ ] Pastikan branch `finalmerge`.
- [ ] Pastikan ZIP backup tidak ikut stage.

## Stage NEXT-2 — Implement onboarding

- [ ] Jalankan SQL `complete_onboarding`.
- [ ] Buat `src/schemas/onboarding.schema.ts`.
- [ ] Buat `app/api/onboarding/route.ts`.
- [ ] Tambah endpoint policy.
- [ ] Buat onboarding CSS.
- [ ] Buat onboarding page.
- [ ] Update auth integration test untuk session lengkap.
- [ ] Tambah test onboarding.

## Stage NEXT-3 — Quality gate

- [ ] `npx tsc --noEmit`
- [ ] `npm test`
- [ ] `npm run lint`
- [ ] `npm run build`

## Stage NEXT-4 — Manual auth flow

```bat
npm run dev
```

Checklist:

- [ ] Guest bisa buka `/login`.
- [ ] Signup user baru.
- [ ] Jika confirmation aktif, confirm email.
- [ ] Login.
- [ ] `onboarding_complete = false` → `/onboarding`.
- [ ] Pilih 0 mode → dashboard.
- [ ] Pilih UMKM → dashboard.
- [ ] Cek `user_stakeholder_modes` di DB.
- [ ] Cek `profiles.onboarding_complete = true`.
- [ ] Login ulang → langsung dashboard.
- [ ] User UMKM existing mempertahankan UMKM mode.
- [ ] ADMIN tetap `account_role = ADMIN`.

## Stage NEXT-5 — Protect dashboard

- [ ] Guest `/` → `/login`.
- [ ] Authenticated tetapi incomplete → `/onboarding`.
- [ ] Completed user → dashboard.
- [ ] Implement frontend logout.
- [ ] Update stakeholder switch berdasarkan mode user.

---

# 14. Data / GIS setelah auth

## Stage DATA-1 — Replace demo data

- [ ] Ganti `DEMO_MERCHANTS` dengan Supabase.
- [ ] Hubungkan canonical UMKM/merchant data.
- [ ] Pisahkan raw mission/survey data dari canonical publishable merchant data.

## Stage DATA-2 — Pedestrian / spatial

- [ ] Walking time via pedestrian network.
- [ ] Hubungkan routing endpoint.
- [ ] Accessibility dari data real.
- [ ] Pertahankan provenance/method/limitation.

## Stage DATA-3 — MAPID / survey ingestion

Schema/data mission yang relevan:

```text
mission_menu_records
mission_receipt_records
mission_property_records
community_activities
survey_submissions
survey_media
```

Survey priority:

```text
Menu Go
Struk Go
Properti Go
Community Activity
UMKM / POI
koordinat
foto pedestrian yang relevan
```

Jangan mewajibkan foto setiap JPO/tangga/ramp; dokumentasikan elemen yang benar-benar memengaruhi akses transit → UMKM/POI.

---

# 15. Known technical debt / audit notes

## Supabase infrastructure duplication

- [ ] Audit kemungkinan duplikat:

```text
/lib/supabase/*
vs
/src/lib/supabase/*
```

## Environment naming

Canonical env source sekarang menggunakan:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
SUPABASE_SERVICE_ROLE_KEY
```

- [ ] Cari source lama yang masih mengharapkan `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- [ ] Pastikan service role naming konsisten.

## Docker / PM2

- [x] Docker bukan backend terpisah.
- [x] Next.js adalah full-stack app.
- [x] Docker dan PM2 adalah opsi deployment.
- [ ] Naming lama `getra-backend` bisa dirapikan nanti.

## MapLibre Docker runtime

- [ ] Pastikan production image menyajikan:

```text
public/maplibre/maplibre-gl-worker.mjs
```

## Endpoint authorization

Policy catalog bukan bukti runtime auth.

- [ ] Audit runtime authorization sebelum production untuk internal POI, UMKM, routing, transport, study areas, dan admin ingestion.

---

# 16. Git checkpoint recommendation

Setelah stage besar selesai:

```bat
git status
git add -u
git commit -m "<descriptive message>"
git push origin finalmerge
```

Hindari `git add .` jika ZIP backup masih untracked.

Suggested commit setelah onboarding:

```text
feat: add stakeholder onboarding flow
```

---

# 17. Quick architecture reference

```text
Supabase Auth
      │
      ▼
public.profiles
account_role
├─ USER
└─ ADMIN
      │
      ▼
user_stakeholder_modes
├─ UMKM
├─ INVESTOR
└─ GOVERNMENT

GENERAL GETRA
→ baseline untuk USER
→ bukan COMMUTER role

COMMUNITY
→ fitur sosial
→ bukan role

UMKM ownership
→ owner_id / merchant_claim relation
→ bukan authorization role
```

---

# 18. Target auth flow

```text
/signup
   ↓
USER created
onboarding_complete = false
   ↓
session?
├─ yes → /onboarding
└─ no  → email confirmation → /login

/login
   ↓
session persisted in Supabase browser client
   ↓
onboarding_complete?
├─ false → /onboarding
└─ true  → /

/onboarding
   ↓
General access always active
   ↓
optional UMKM / INVESTOR / GOVERNMENT
   ↓
complete_onboarding()
   ↓
profiles.onboarding_complete = true
   ↓
/
```

---

# 19. Things that MUST NOT be reintroduced

- [x] No public role selector at signup.
- [x] No `COMMUTER` authorization role.
- [x] No `COMMUNITY` authorization role.
- [x] No `UMKM_OWNER` authorization role.
- [x] No `profiles.role`.
- [x] No `profiles.app_role`.
- [x] No `user_role` enum.
- [x] No `app_role` enum.
- [x] No user-controlled `account_role = ADMIN`.
- [x] UMKM mode bukan bukti ownership suatu merchant.
- [x] Merchant ownership tetap perlu `owner_id` / claim relation.

---

# 20. Short version — lanjut dari sini

```text
DONE
[x] USER/ADMIN authorization model
[x] stakeholder modes table
[x] migrate legacy UMKM
[x] remove profiles.role
[x] remove profiles.app_role
[x] remove user_role enum
[x] remove app_role enum
[x] update backend auth/profile
[x] update tests/scripts
[x] login/signup frontend initial implementation
[x] TypeScript check after frontend auth

NEXT
[ ] complete_onboarding SQL
[ ] onboarding schema
[ ] /api/onboarding
[ ] endpoint policy
[ ] onboarding page + CSS
[ ] auth test session refresh_token update
[ ] full test
[ ] lint
[ ] build
[ ] manual signup → login → onboarding → dashboard
[ ] protect dashboard
[ ] logout
[ ] dynamic stakeholder switch
```

---

## Final note untuk teammate

Jika source/database aktual berbeda dengan dokumen ini, **prioritaskan kondisi source dan database aktual lalu audit sebelum overwrite**. Jangan menghidupkan kembali legacy role hanya karena menemukan string `COMMUTER`, `COMMUNITY`, atau `UMKM`; cek dulu konteksnya apakah authorization, stakeholder mode, atau data survei.
