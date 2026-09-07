# Properti Go: area peta dan tata letak

Implementasi pada branch `finalmerge`, 5 September 2026.

## Masalah yang diperbaiki

- Pencarian Investor memakai wilayah Jakarta Selatan secara tetap, sementara pengguna dapat menggeser peta ke lokasi lain.
- Pembaruan hasil dan pemilihan properti memicu penyesuaian kamera. Hasil pencarian tidak mengikuti area peta yang sedang dilihat.
- Selector `.business-space button` menimpa grid kartu menjadi flex satu baris dan mengubah ukuran kontrol bawaan MapLibre. Browser menunjukkan lebar isi daftar 716px pada panel 340px, termasuk pada mobile.
- Ukuran canvas tidak selalu mengikuti panel dan pembaruan data dapat terlewat saat layer baru dibuat.
- Pagination menghitung jumlah hasil dari pemindaian parsial sehingga halaman berikutnya dapat tidak tersedia.
- Detail memaksakan parameter wilayah Jakarta Selatan; penentuan wilayah berdasarkan bounding rectangle juga dapat mengaitkan properti di luar Jakarta dengan analisis Jakarta.
- Respons detail, perbandingan, dan penjelasan lama dapat tampil setelah pilihan/kategori/periode berubah.

## Perilaku akhir

1. Peta mengirim batas area sesungguhnya saat siap dan setiap selesai digeser atau diperbesar.
2. Hook menunggu 250ms, membatalkan request sebelumnya, lalu meminta Properti Go dalam bbox tersebut. Hasil lama dibersihkan; respons kedaluwarsa diabaikan.
3. Daftar dan titik memakai hasil yang sama. Pemilihan properti dan pembaruan hasil mempertahankan posisi kamera.
4. Filter alamat/kata kunci, jenis properti, dan dijual/disewa berlaku dalam area peta.
5. Hasil kosong menampilkan petunjuk menggeser peta atau mengubah filter. Area yang terlalu luas meminta pengguna memperbesar peta.
6. Halaman awal memuat maksimal 24 properti; tombol tambahan mengikuti pagination API. Batas pemindaian ditampilkan sebagai kebutuhan mempersempit area, bukan klaim bahwa tidak ada properti.
7. Detail dipilih oleh pengguna. Pilihan perbandingan 2–4 properti tetap tersimpan ketika peta digeser; hasil analisis hanya tampil untuk kategori, periode, dan pilihan yang sesuai.
8. Desktop memisahkan daftar, peta, dan detail. Mobile menampilkan peta terlebih dahulu, lalu daftar dan detail. CSS tombol aplikasi tidak menimpa kontrol MapLibre.

## Implementasi

Frontend utama:

- `frontend/src/features/business-space/components/business-space-workspace.tsx`
- `frontend/src/features/business-space/components/business-space-map.tsx`
- `frontend/src/features/business-space/components/property-candidate-detail.tsx`
- `frontend/src/features/business-space/components/property-comparison.tsx`
- `frontend/src/features/business-space/hooks/use-property-candidates.ts`
- `frontend/src/features/business-space/hooks/use-property-analysis.ts`
- `frontend/src/features/business-space/utils/property-candidate-loader.ts`
- `frontend/src/features/business-space/utils/property-viewport.ts`
- `frontend/src/features/business-space/utils/property-map.ts`
- Service/types fitur yang sama dan blok CSS Properti Go di `frontend/app/globals.css`.

Backend utama:

- `backend/src/features/business-space-intelligence/business-space.repository.ts`
- `backend/src/features/business-space-intelligence/business-space.service.ts`
- `backend/src/features/business-space-intelligence/business-space.schema.ts`
- `backend/src/features/business-space-intelligence/business-space.geometry.ts`
- `backend/src/features/business-space-intelligence/business-space-insight.service.ts`
- `backend/app/api/business-space/candidates/[candidateId]/route.ts`

Endpoint existing tetap digunakan: `/api/business-space/candidates`, `/api/business-space/candidates/[candidateId]`, `/api/business-space/compare`, dan `/api/business-space/insight`. Sumber properti tetap repository/RPC spasial MAPID Mission untuk `PROPERTI_GO`.

Respons daftar menambah `total_is_exact` dan `search_truncated` untuk menjelaskan pemindaian terbatas. Detail kini memvalidasi kategori/periode tanpa mensyaratkan bbox/wilayah. Tidak ada endpoint baru, migration, perubahan role, atau data mock produksi.

Wilayah detail diperiksa menggunakan polygon/MultiPolygon administratif yang tersedia. Properti di luar wilayah analisis yang didukung tetap muncul pada peta; informasi pasar ditandai belum tersedia. Parser koordinat tidak lagi mengganti geometry gagal dengan titik `[0,0]`.

## Batas data

- Properti yang ditampilkan adalah observasi Properti Go; ketersediaan jual/sewa tetap harus dikonfirmasi kepada pemilik/agen.
- Bbox mengikuti kontrak existing: rentang maksimum 1° per sumbu, limit 24, offset maksimum 500.
- Filter teks/jenis/penawaran dipindai maksimal 4.000 observasi sumber. `search_truncated` menandai jika hasil belum lengkap.
- Data pasar berskala wilayah administratif, bukan proyeksi omzet properti. Nilai dengan status selain `AVAILABLE` tidak ditampilkan sebagai skor atau digunakan sebagai fakta numerik penjelasan AI.
- Perbandingan usaha sejenis memakai bbox sekitar properti yang sudah didukung repository; bukan jumlah semua usaha di kota.
- Pemeriksaan database secara read-only menemukan 7 observasi pada bbox Jakarta `106.78,-6.23,106.86,-6.16` dan 19 pada bbox Pamulang `106.7,-6.4,106.8,-6.3`. Jumlah ini adalah bukti saat pengujian, bukan angka yang ditanam di UI.

## Verifikasi

- Unit test viewport mencakup debounce, pembatalan, respons lama, hasil kosong, pagination, batas area, cleanup, dan kamera tetap.
- Test service memeriksa bbox/filter, detail tanpa wilayah paksa, dan AbortSignal.
- Test presentasi memeriksa hasil kosong/truncated, alamat kartu, batas empat pilihan, dan skor dengan data yang belum cukup.
- Test backend mencakup batas polygon, geometry, pagination, scope detail, serta konsistensi data penjelasan.
- Uji browser menggunakan komponen/hook/MapLibre aktual dengan fixture API terisolasi di `outputs/property-viewport-review`; database produksi tidak dimutasi.

Hasil akhir:

- `npm test`: frontend 178/178 lulus; backend 917 lulus, 3 dilewati oleh suite existing.
- `npm run lint`: frontend dan backend lulus, tanpa warning.
- `npm run typecheck`: frontend, backend, dan root lulus.
- `npm run build`: build produksi frontend dan backend lulus.
- Browser Chrome dengan MapLibre aktual: 8 kelompok pemeriksaan lulus, nol error console/page, nol pelanggaran axe WCAG A/AA pada workspace.
- Lebar 1366, 1024, 768, dan 390px: tidak ada overflow horizontal halaman/daftar/detail; canvas mengikuti ukuran panel; kontrol MapLibre tetap 29×29px.
- Respons lambat diuji untuk pergantian area, detail kategori, perbandingan kategori, dan penjelasan periode. Hasil lama tetap tersembunyi setelah pilihan berubah, termasuk saat kembali ke kategori semula.
- Bukti lokal: `outputs/property-viewport-review/results.json`, `desktop-comparison.png`, `mobile.png`, serta log tests/lint/typecheck. Fixture digunakan hanya oleh harness pengujian.
