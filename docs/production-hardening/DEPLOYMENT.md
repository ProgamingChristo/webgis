# Deployment dan rollback

Dibuat 2026-09-21T03:54:06.357Z. Kandidat kode: `ee65dbf027308417a206e9c65c402becf3b502ac`. Branch: `fix/production-hardening-20260920`. Status penerimaan keseluruhan: **NOT_READY**. Build: **PASS**.

Frontend: https://getra-routing-api.tail0ed517.ts.net:8443

Login: https://getra-routing-api.tail0ed517.ts.net:8443/login

Backend health: https://getra-routing-api.tail0ed517.ts.net/api/health

URL ini tetap dipertahankan. Laporan membedakan kandidat dari deployment publik.

## Isolasi

Worktree D:/Getra_Hardening, terpisah dari D:/Getra_Production yang sedang dikerjakan proses lain. Snapshot base d029708; branch hardening tidak melakukan reset/clean/force-push terhadap pekerjaan lain.

VM kandidat: /home/getra/getra-hardening-20260920, compose project getra-hardening; frontend 127.0.0.1:3100 dan backend 127.0.0.1:8180. Produksi tetap frontend3003/backend3002 melalui Tailscale URL kanonis. Node22 image dipin digest; image revision berisi SHA kode. Compose kandidat memakai routing network getra_default dan secret env yang sudah ada.

Build: PASS. Kandidat: RUNNING. Promoted: false.

## Prosedur operator

1. git fetch --all --prune; audit branch, status, remote dan runtime revision.
2. Buat archive SHA tervalidasi; jangan menyalin node_modules, .env atau output browser ke build context.
3. Build frontend/backend dari docs/qa/phase10d/compose.yml memakai GETRA_RELEASE_SHA, GETRA_FRONTEND_PORT=3100, GETRA_BACKEND_PORT=8180 dan project getra-hardening. Tambahkan override docs/production-hardening/candidate-compose.yml untuk origin SSH localhost; override ini tidak dipakai produksi.
4. Jalankan kandidat, health check, tunnel lokal 3100/8180, lalu uji basemap, auth, source, Journey, service area, keamanan dan responsive.
5. Lengkapi semua blocker pada QA_REPORT. Promosi hanya setelah candidate PASS dan rekonsiliasi commit deployment paralel.
6. Simpan image/frontend-backend revision sebelumnya sebelum perubahan routing publik. Uji tiga URL kanonis kembali.

Rollback: gunakan kembali pasangan image produksi yang dicatat sebelum promosi, compose up -d hanya service yang berubah, lalu health/login/route smoke. Kandidat terisolasi dapat dihentikan melalui docker compose -p getra-hardening ... stop; jangan menghentikan project produksi. Pada laporan ini tidak ada promosi sehingga produksi tidak membutuhkan rollback hardening.
