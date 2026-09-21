# Catatan perubahan kandidat

Dibuat 2026-09-21T03:49:29.520Z. Kandidat kode: `ee65dbf027308417a206e9c65c402becf3b502ac`. Branch: `fix/production-hardening-20260920`. Status penerimaan keseluruhan: **NOT_READY**. Build: **PASS**.

Frontend: https://getra-routing-api.tail0ed517.ts.net:8443

Login: https://getra-routing-api.tail0ed517.ts.net:8443/login

Backend health: https://getra-routing-api.tail0ed517.ts.net/api/health

URL ini tetap dipertahankan. Laporan membedakan kandidat dari deployment publik.

## Diperbaiki

- Basemap pertama setelah login tidak kembali ke MAPID tanpa permintaan; layer aplikasi direhidrasi dengan dependency registry.
- Race data peta saat style sibuk dan overlay service-area yang sebelumnya hilang.
- Service area memakai kontur pedestrian Valhalla jika RPC graph belum siap, dengan metadata yang jujur.
- Normalisasi kualitas, batas cache, deduplikasi, retry/circuit breaker dan logging provider.
- 17 embed kamera spesifik; synthetic inference/metrik dihapus; sensor tanpa feed tetap unavailable.
- Halaman konsep lama memerlukan pilihan eksplisit SIMULATION.
- Intent CCTV/sensor/produk dan komposit international, pembatasan body dan kebijakan endpoint publik.
- Kontras serta struktur tombol CCTV dan label aksesibilitas.

## Yang belum selesai

- CARTO Light/Dark: kredensial belum tersedia; fallback MAPID teruji, tetapi tile CARTO belum lolos uji nyata.
- NASA FIRMS, OpenAQ, GeoNames: kredensial belum tersedia. Fire, air-quality, places, elevation, timezone mengembalikan AUTH_REQUIRED.
- Flood, disaster dan satellite: kontrak feed resmi belum terhubung. Radar/Overpass dapat gagal di penyedia; tidak diganti data contoh.
- CCTV AI: tidak ada input frame ke layanan inference. Seluruh hitungan, FPS, model dan bounding box harus tetap tidak tersedia.
- Sensor: 9 entri inventory, 0 sensor dengan observasi runtime terverifikasi; tidak boleh dinyatakan sebagai sensor aktif.
- Deployment publik berubah oleh pekerjaan paralel. Audit publik masih menemukan canvas sintetis dengan klaim YOLOv8/TensorRT dan hitungan objek; kandidat menghapusnya tetapi belum dipromosikan. Bukti kandidat bukan bukti versi publik.
- Belum ada audit manual WCAG menyeluruh, pengukuran LCP/INP lapangan, atau pengujian payload lengkap untuk setiap adapter.
- Skor hallucination/groundedness 154 jawaban belum diukur dengan review klaim per klaim. Full-screen mobile dan pengujian transaksi pembayaran produksi belum lengkap.

PDF ini melengkapi panduan international sebelumnya. Screenshot baru diberi konteks kandidat, bukan diklaim sebagai versi publik setelah promosi.
