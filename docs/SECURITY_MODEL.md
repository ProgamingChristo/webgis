# GETRA Foundation Security Model

## Browser public/anon

Boleh:
- membaca active categories;
- membaca public+confirmed source metadata;
- membaca validated + public study areas;
- membaca validated + public transport corridors/nodes;
- membaca PUBLISHED canonical merchants dengan quality SURVEYED/VERIFIED;
- menjalankan read-only merchant spatial RPC yang tetap tunduk pada RLS.

Tidak boleh:
- membaca profiles;
- membaca owner UMKM profiles;
- membaca raw MAPID;
- membaca survey evidence;
- membaca receipt;
- membaca ingestion/moderation/audit/AI traces;
- menulis spatial foundation data.

## Authenticated user

Tambahan akses:
- membaca profile sendiri;
- update hanya display_name/avatar_url/onboarding_complete sendiri;
- membaca dan update preference sendiri.

Tidak dapat mengubah `app_role`.

## UMKM_OWNER

Dapat membuat owner-submitted `umkm_profiles` sendiri melalui kolom user-controlled.
Tidak dapat menetapkan:
- validation status;
- source lineage;
- canonical merchant link;
- validated timestamp.

## CONTRIBUTOR

Dapat membuat survey submission sendiri.
Hanya pending submission miliknya yang dapat diedit melalui browser.

## MODERATOR / ADMIN

Moderation dan privileged writes dirancang melalui guarded backend menggunakan server secret,
bukan direct browser DML.

## Service role

Backend-only.
Memiliki akses ke raw/ingestion/moderation tables.
Secret key tidak boleh masuk client bundle.

## Important distinction

PostgreSQL object privileges dan Row Level Security adalah dua lapisan terpisah.
Migration mencabut dangerous whole-table privileges dari browser roles bahkan ketika RLS aktif.
