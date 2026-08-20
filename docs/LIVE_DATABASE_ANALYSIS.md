# GETRA Live Database Analysis

## 1. Existing schema yang dipertahankan

### `spatial_sources`
Dipertahankan dan diperluas. Tabel ini sudah menjadi provenance root untuk study area,
transport corridor, transport node, dan owner-submitted UMKM profile.

Tidak dibuat tabel `data_sources` kedua karena akan menduplikasi domain.

### `study_areas`
Dipertahankan.

Existing contract:
- `geometry MULTIPOLYGON SRID 4326`
- source lineage
- data version
- validation status
- retrieved / validated timestamps
- JSON metadata
- GiST geometry index

Ini cocok sebagai boundary pilot dan scope setiap analysis run.

### `transport_corridors`
Dipertahankan.

Existing contract:
- `geometry MULTILINESTRING SRID 4326`
- transport mode
- source lineage
- data version / validation
- spatial index

### `transport_nodes`
Dipertahankan.

Existing contract:
- `geometry POINT SRID 4326`
- corridor FK
- node type
- transport mode
- source lineage
- geometry and geography GiST indexes

## 2. Authorization model yang diperbaiki

Legacy enum `user_role`:
- COMMUTER
- UMKM
- COMMUNITY
- ADMIN

Enum tersebut mencampur stakeholder/persona dengan authorization.

Foundation baru menggunakan:

### `app_role`
- USER
- CONTRIBUTOR
- UMKM_OWNER
- MODERATOR
- ADMIN

### `stakeholder_mode`
- COMMUTER
- UMKM
- INVESTOR
- GOVERNMENT

`app_role` menentukan permission.
`stakeholder_mode` menentukan sudut pandang decision-support UI.

Legacy `profiles.role` TIDAK langsung dihapus karena function/trigger lama sudah bergantung
pada enum tersebut. Column tersebut diberi status legacy dan tidak diberikan update privilege
kepada browser. Setelah seluruh application code dipastikan tidak memakai field lama, cleanup
dapat dilakukan dalam migration terpisah.

## 3. Temuan security privileges

Audit live menunjukkan `anon`/`authenticated` memiliki beberapa table privileges yang terlalu
luas, termasuk TRUNCATE, TRIGGER, dan REFERENCES.

Security hotfix mencabut semua table privilege pada existing GETRA tables lalu mengembalikan
hanya akses minimum yang benar.

RLS tetap digunakan, tetapi privilege PostgreSQL dan RLS diperlakukan sebagai dua lapisan
berbeda.

## 4. Canonical merchant vs UMKM owner profile

Existing `umkm_profiles` mempunyai:
- owner_id NOT NULL
- business_name
- category text
- geometry
- provenance fields

Karena owner_id wajib, tabel tersebut tidak bisa menjadi canonical representation semua
merchant yang ditemukan dari MAPID, survey, atau open data.

Arsitektur baru:

```text
MAPID records ─┐
Survey ────────┤
Open data ─────┼── normalization/dedup ──> merchants
Owner profile ─┘                              │
                                              └── optional link -> umkm_profiles
```

`umkm_profiles` dipertahankan sebagai owner-submitted / owner-managed profile.
`merchants` adalah canonical publishable spatial business layer.

## 5. Validation dimensions

Existing `validation_status`:
- PENDING
- VALIDATED
- REJECTED
- ARCHIVED

Dipertahankan sebagai workflow/moderation state.

Canonical merchants memiliki dimensi berbeda:

`data_quality_status`
- UNVERIFIED
- SURVEYED
- VERIFIED
- STALE
- REJECTED
- SYNTHETIC

dan:

`publish_status`
- DRAFT
- PUBLISHED
- HIDDEN
- ARCHIVED

Dengan demikian moderation workflow tidak dicampur dengan kualitas bukti.

## 6. Competition raw datasets

Raw data tetap terpisah:
- community_activities
- mission_menu_records
- mission_receipt_records
- mission_property_records

Raw tables berada di schema `public` agar backend Supabase service client masih dapat
mengaksesnya, tetapi:
- RLS aktif;
- tidak ada browser policies;
- privilege anon/authenticated dicabut;
- service_role mendapat backend access.

Receipt records diberi privacy state RESTRICTED secara default.

## 7. Survey foundation

Format final survey belum dikunci.

`survey_submissions.attributes JSONB` berfungsi sebagai staging envelope.
Stable fields seperti contributor, geometry, observed time, status, dan privacy dinormalisasi.
Field survey yang belum final berada di `attributes` sampai kontrak lapangan stabil.

## 8. GIS Step 3 boundary

Step 2 tidak membuat:
- pedestrian_nodes
- pedestrian_edges
- pgRouting route functions
- network service area
- accessibility score production

Step 3 baru dimulai setelah sumber pedestrian graph dan pilot scope diputuskan.
