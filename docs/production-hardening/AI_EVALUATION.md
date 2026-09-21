# Evaluasi AI berbasis bukti

Dibuat 2026-09-21T03:49:29.520Z. Kandidat kode: `ee65dbf027308417a206e9c65c402becf3b502ac`. Branch: `fix/production-hardening-20260920`. Status penerimaan keseluruhan: **NOT_READY**. Build: **PASS**.

Frontend: https://getra-routing-api.tail0ed517.ts.net:8443

Login: https://getra-routing-api.tail0ed517.ts.net:8443/login

Backend health: https://getra-routing-api.tail0ed517.ts.net/api/health

URL ini tetap dipertahankan. Laporan membedakan kandidat dari deployment publik.

## Metode

154 pertanyaan dalam 14 kategori terdapat di ai-questions.json. Baseline dan hasil memakai /api/ai/ask yang benar-benar berjalan, login akun QA ordinary, konteks Jakarta dan tool data nyata jika terkonfigurasi. Mode benchmark menaikkan rate limit hanya pada development.

| Metrik | Baseline | Kandidat |
|---|---:|---:|
| HTTP 200 | 154/154 | 154/154 |
| Kecocokan kategori intent | 87.01% | 99.35% |
| Jawaban dengan evidence | 103 | 101 |
| p50 | 167 ms | 338 ms |
| p95 | 1219 ms | 1170 ms |

Evaluator mencocokkan kelompok intent dengan regex kompatibilitas, bukan menilai kebenaran semantik semua jawaban. Pertanyaan keluar akun dipetakan PROFILE (perbedaan kategori). Gap panduan penggunaan yang sebelumnya dipetakan SEARCH_PLACE diperbaiki dan diuji ulang melalui unit serta HTTP. Jumlah evidence tercatat di tabel; adanya evidence bukan bukti semua jawaban benar.

Hallucination rate dan groundedness = null (belum diukur melalui review klaim). Latensi dipengaruhi cache, provider dan mesin; tidak ada kesimpulan peningkatan 100×. Tes offline 154 pertanyaan menguji classifier saja.

Router eksplisit: SEARCH_PLACE, NEARBY, ROUTE, TRANSIT, UMKM, PROMOTION, CCTV, SENSOR, WEATHER, EARTHQUAKE, FIRE, AIR_QUALITY, FLOOD, ACCESSIBILITY, COMMUNITY, ADMIN, GENERAL_HELP dan INTERNATIONAL. Komposit data internasional menjalankan maksimal tiga tool. CCTV menjawab inventory/tautan resmi; sensor tanpa data menjawab tidak tersedia. GIS tidak diganti narasi model.
