# Keamanan dan aksesibilitas

Dibuat 2026-09-21T03:54:06.357Z. Kandidat kode: `ee65dbf027308417a206e9c65c402becf3b502ac`. Branch: `fix/production-hardening-20260920`. Status penerimaan keseluruhan: **NOT_READY**. Build: **PASS**.

Frontend: https://getra-routing-api.tail0ed517.ts.net:8443

Login: https://getra-routing-api.tail0ed517.ts.net:8443/login

Backend health: https://getra-routing-api.tail0ed517.ts.net/api/health

URL ini tetap dipertahankan. Laporan membedakan kandidat dari deployment publik.

## Pemeriksaan HTTP

- anonymous profile denied: HTTP 401, PASS.
- anonymous admin denied: HTTP 401, PASS.
- unknown layer: HTTP 404, PASS.
- invalid coordinates: HTTP 400, PASS.
- malformed JSON: HTTP 400, PASS.
- oversized JSON: HTTP 413, PASS.
- untrusted origin blocked: HTTP 403, PASS.
- ordinary user admin denied: HTTP 403, PASS.
- frontend security headers: HTTP 200, PASS.

Tidak ada perubahan pembayaran, klaim merchant atau moderasi melalui pengujian read-only ini. Regresi unit mencakup autentikasi, RBAC/RLS/ownership yang sudah tersedia; ini bukan audit penetration testing menyeluruh.

## Kontrol data provider

Validasi public URL/DNS membatasi SSRF. Body provider dibatasi 8 MB, body interpretasi 16 KB. Timeout/retry/circuit breaker membatasi kegagalan upstream. Log memuat request ID, provider ID, endpoint, latency, status, error code, cache, quality dan count; tidak menyertakan token atau body request. Secrets tetap environment server.

CSP frontend memakai allowlist iframe kamera resmi, frame-ancestors none, object-src none, nosniff dan DENY. CSP aplikasi masih mempunyai unsafe-inline/unsafe-eval yang diwarisi; belum merupakan nonce-based CSP penuh. Rate limiter/cache masih per proses.

## Aksesibilitas

Playwright + axe-core pada viewport 390×844: login, weather dan CCTV, 0 pelanggaran terdeteksi. Nama tombol ikon diperjelas; nested button kamera dihapus; teks/placeholder diberi kontras dan fokus terlihat. Bukti ini hanya subset otomatis WCAG 2.1 AA, bukan sertifikasi seluruh aplikasi atau iframe provider.


## Dependency security

Patch kandidat: Next.js 16.3.5, MapLibre GL 6.4.1, sharp 0.35.4 dan js-yaml 4.3.2. Backend build kembali memeriksa error TypeScript. Audit runtime: {"info":0,"low":0,"moderate":0,"high":0,"critical":0,"total":0}. Audit seluruh dependency termasuk tooling: {"info":0,"low":0,"moderate":4,"high":0,"critical":0,"total":4}. Temuan tooling harus ditinjau terpisah; tidak dinyatakan sebagai endpoint produksi.

Sumber maintainer: [Next.js Windows RCE](https://github.com/vercel/next.js/security/advisories/GHSA-p293-qw3h-jr36), [Next.js image optimization](https://github.com/advisories/GHSA-2xp9-vwfh-vxw4), [MapLibre sanitizer](https://github.com/maplibre/maplibre-gl-js/security/advisories/GHSA-jrc7-96c5-q579), [sharp](https://github.com/advisories/GHSA-rgj7-g3m4-5g8c), [js-yaml](https://github.com/advisories/GHSA-2883-xcg3-v3hh).
