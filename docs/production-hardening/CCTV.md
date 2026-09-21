# CCTV, AI Vision dan sensor

Dibuat 2026-09-21T03:54:06.357Z. Kandidat kode: `ee65dbf027308417a206e9c65c402becf3b502ac`. Branch: `fix/production-hardening-20260920`. Status penerimaan keseluruhan: **NOT_READY**. Build: **PASS**.

Frontend: https://getra-routing-api.tail0ed517.ts.net:8443

Login: https://getra-routing-api.tail0ed517.ts.net:8443/login

Backend health: https://getra-routing-api.tail0ed517.ts.net/api/health

URL ini tetap dipertahankan. Laporan membedakan kandidat dari deployment publik.

## Bukti kamera

20 entri kamera. 17 embed spesifik diverifikasi dari portal resmi pada 2026-09-20T07:52:38.352Z; tiga entri belum memiliki preview terverifikasi. Sumber: https://jakcctv.jakarta.go.id/publik. HTTP 200 membuktikan endpoint dapat diambil, bukan kesehatan seluruh stream. Browser kandidat memeriksa video di dalam iframe; rincian readyState, dimensi dan currentTime ada pada evidence/responsive.json.

Player nyata memakai allowlist jakcctv.jakarta.go.id, dki-jkt.balitower.co.id:7028 dan cctv-jsc.balitower.co.id:8011. Registry health tetap UNKNOWN sampai ada pemeriksaan berkala; last_frame_at tidak dibuat dari waktu halaman dibuka.

## Cara memakai

1. Buka https://getra-routing-api.tail0ed517.ts.net:8443/international/cctv.
2. Pilih tab Live CCTV. Cari nama kamera atau gunakan Filter wilayah/provider/status.
3. Tekan nama kamera. Preview hanya memuat kamera terpilih; tombol layar penuh memperbesar player.
4. Jika preview gagal, pilih Sumber resmi. Periksa label UNKNOWN/NO_STREAM dan waktu verifikasi.
5. Tab AI Vision menampilkan UNAVAILABLE ketika tidak ada inference terhubung. Video yang terlihat tidak membuktikan deteksi AI.
6. Tab Sensors menampilkan inventory dan DATA UNAVAILABLE bila tidak ada observasi resmi.

## Perubahan integritas

Dihapus: metrik FPS/latensi/model/hitungan statis, synthetic bounding boxes dan klaim inference LIVE. Script update-registry-ai dinonaktifkan. Tidak ada model computer vision produksi yang diaktifkan oleh perubahan ini. Nilai sensor dan waktu verifikasi tidak dibuat-buat.

License dan kebijakan privasi mengikuti penyedia. GETRA tidak mengklaim masking runtime yang belum dilakukan. Embed resmi tidak memberi hak untuk mengunduh stream privat atau melatih model.
