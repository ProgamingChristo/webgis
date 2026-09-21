# Panduan penggunaan 20 fitur

Dibuat 2026-09-21T03:49:29.520Z. Kandidat kode: `ee65dbf027308417a206e9c65c402becf3b502ac`. Branch: `fix/production-hardening-20260920`. Status penerimaan keseluruhan: **NOT_READY**. Build: **PASS**.

Frontend: https://getra-routing-api.tail0ed517.ts.net:8443

Login: https://getra-routing-api.tail0ed517.ts.net:8443/login

Backend health: https://getra-routing-api.tail0ed517.ts.net/api/health

URL ini tetap dipertahankan. Laporan membedakan kandidat dari deployment publik.

## Langkah umum

Buka /international, pilih kategori/layer, klik peta atau isi latitude/longitude, atur radius/filter lalu tekan Muat data / Retry. Periksa Data & sumber, timestamp, TTL, coverage, quality dan license. Klik titik atau baris hasil untuk detail; Rute ke lokasi ini menyerahkan koordinat ke GIS GETRA. Interpretasi berbasis data merangkum query yang benar-benar dimuat.

Gunakan Basemap untuk MAPID/OSM/CARTO Light/CARTO Dark/Esri Satellite. Fallback akan dijelaskan jika provider tidak tersedia. Reset ke MAPID mengembalikan default. Mobile memiliki kontrol bertumpuk dan drawer basemap; mode fullscreen peta GDC belum lengkap.

AUTH_REQUIRED: operator perlu melengkapi kredensial. ERROR/OFFLINE: retry setelah koneksi/sumber pulih. STALE: baca waktu sumber sebelum menggunakan. UNAVAILABLE: jangan menafsirkan kekosongan sebagai kondisi aman.

## 1. Global Weather Now

https://getra-routing-api.tail0ed517.ts.net:8443/international/weather

Melihat cuaca model dan prakiraan pada lokasi yang dipilih.

1. Pilih koordinat melalui klik peta atau isi Latitude dan Longitude.
2. Untuk Indonesia, isi kode desa BMKG (adm4) bila tersedia; tanpa kode desa digunakan Open-Meteo.
3. Tekan Muat data / Retry. Klik titik atau nama hasil untuk membuka suhu, kelembapan, angin, hujan, visibilitas dan forecast.
4. Periksa Updated, TTL, sumber dan status sebelum memakai hasil.

Batas: BMKG adalah prakiraan; Open-Meteo adalah keluaran model, bukan sensor lapangan. TTL Open-Meteo 15 menit, BMKG 6 jam.

## 2. Global Earthquake Live

https://getra-routing-api.tail0ed517.ts.net:8443/international/earthquakes

Menelusuri gempa dalam feed satu hari terakhir berdasarkan jarak dan magnitudo.

1. Pilih pusat pencarian dan radius. Pilihan Global (gempa) menampilkan jangkauan dunia.
2. Pilih magnitudo minimum M2+, M4+, M5+ atau M6+; waktu dapat dibatasi.
3. Tekan Muat data / Retry dan perbesar cluster untuk melihat kejadian.
4. Buka detail untuk magnitudo, kedalaman, waktu kejadian dan pembaruan provider.

Batas: Feed bukan prediksi gempa. Tsunami flag/alert hanya ditampilkan jika disediakan USGS. TTL 60 detik.

## 3. Active Fire / Hotspot

https://getra-routing-api.tail0ed517.ts.net:8443/international/active-fire

Memetakan deteksi titik panas satelit yang diterbitkan FIRMS.

1. Operator memasang NASA_FIRMS_MAP_KEY pada backend.
2. Pilih koordinat dan radius, lalu tekan Muat data / Retry.
3. Jika sumber terhubung, klik hotspot untuk confidence, acquisition time, satellite dan FRP bila tersedia.
4. Jika AUTH_REQUIRED muncul, minta operator mengaktifkan sumber; jangan menafsirkan peta kosong sebagai tidak ada kebakaran.

Batas: Pada audit ini key belum tersedia. Deteksi satelit bukan konfirmasi kebakaran di permukaan. TTL 15 menit.

## 4. Global Air Quality

https://getra-routing-api.tail0ed517.ts.net:8443/international/air-quality

Membaca pengamatan kualitas udara dari stasiun dan sensor yang dipublikasikan.

1. Operator memasang OPENAQ_API_KEY pada backend.
2. Pilih koordinat dan radius, kemudian muat data.
3. Buka detail sensor untuk parameter, nilai, satuan, provider dan waktu pengamatan.
4. Bandingkan hasil hanya setelah memeriksa satuan serta freshness setiap sensor.

Batas: Key belum tersedia pada audit ini. Parameter yang tidak dilaporkan tidak diisi angka nol. Maksimum 10 lokasi per kueri; TTL 1 jam.

## 5. Global Place / Geocoding

https://getra-routing-api.tail0ed517.ts.net:8443/international/places

Mencari nama tempat dan koordinat untuk konteks peta serta tujuan rute.

1. Operator mengaktifkan akun web services GeoNames melalui GEONAMES_USERNAME.
2. Isi Cari tempat / sistem dengan nama kota atau tempat, atau kosongkan untuk pencarian dekat koordinat.
3. Muat hasil dan pilih tempat untuk melihat negara, wilayah administratif, timezone/elevasi bila tersedia.
4. Gunakan Rute ke lokasi ini untuk mengirim koordinat ke perencana rute GETRA.

Batas: Akun GeoNames belum tersedia. AI tidak menebak koordinat nama tempat jika resolusi sumber gagal. TTL 24 jam.

## 6. Global Elevation Query

https://getra-routing-api.tail0ed517.ts.net:8443/international/elevation

Membaca elevasi terrain pada titik dan sampel rute.

1. Pilih koordinat pada peta dan muat data setelah akun GeoNames aktif.
2. Untuk profil, isi pasangan [longitude,latitude] dalam array JSON, maksimal 20 titik.
3. Ambil rute aktif hanya bekerja jika geometri rute masih dapat dibaca dalam konteks halaman.
4. Buka detail sampel untuk elevasi dan jarak geodesik kumulatif.

Batas: Key/account belum tersedia. Resolusi SRTM3 sekitar 90 m; nilai no-data tetap null. Bukan profil kemiringan rinci atau analisis keselamatan.

## 7. Global Timezone / Sun

https://getra-routing-api.tail0ed517.ts.net:8443/international/timezone

Membaca zona waktu, waktu lokal, matahari terbit dan terbenam dari koordinat.

1. Pastikan GEONAMES_USERNAME telah diaktifkan operator.
2. Pilih koordinat tujuan dan tekan Muat data / Retry.
3. Buka hasil untuk timezone, local time, sunrise, sunset dan offset yang dipublikasikan.
4. Periksa waktu fetch; tampilan waktu lokal adalah respons sumber, bukan jam yang terus berdetak.

Batas: Akun belum tersedia. String waktu lokal tidak dianggap UTC secara otomatis. TTL respons sukses 1 jam.

## 8. OpenStreetMap POI Explorer

https://getra-routing-api.tail0ed517.ts.net:8443/international/poi

Mencari fasilitas nyata berdasarkan tag OSM.

1. Pilih pusat pencarian dan radius; kueri Overpass dibatasi sampai 10 km.
2. Pilih Fasilitas, misalnya restaurant, pharmacy, hospital atau library.
3. Tekan Muat data / Retry; permintaan tidak berjalan otomatis pada setiap gerakan peta.
4. Klik titik/hasil untuk tag, waktu edit, sumber objek OSM dan tautan rute.

Batas: Data tergantung kelengkapan kontribusi OSM. Timeout provider dapat terjadi; maksimal 1000 objek. TTL 1 jam.

## 9. Accessible Facility Finder

https://getra-routing-api.tail0ed517.ts.net:8443/international/accessibility

Menemukan fasilitas dengan tag wheelchair yang eksplisit.

1. Pilih toilet, entrance, parking, hospital atau station pada Fasilitas.
2. Atur koordinat/radius dan muat data.
3. Baca wheelchair=yes, limited atau no pada detail; jangan menganggap semua hasil aksesibel penuh.
4. Jika hasil kosong, itu berarti tidak ada objek bertag yang cocok dalam hasil kueri, bukan bukti tidak adanya fasilitas.

Batas: GETRA tidak menginfer aksesibilitas tanpa tag. Kondisi lapangan dan pembaruan OSM dapat berbeda. TTL 1 jam.

## 10. Drinking Water Map

https://getra-routing-api.tail0ed517.ts.net:8443/international/water-refill

Menemukan lokasi air minum yang tercatat di OSM.

1. Pilih lokasi dan radius, lalu muat data.
2. Buka titik untuk access, bottle refill, indoor dan opening hours jika tag tersedia.
3. Periksa sumber dan waktu edit sebelum menuju lokasi.
4. Gunakan Rute ke lokasi ini untuk melanjutkan ke perencana perjalanan.

Batas: Keberadaan tag bukan jaminan keamanan air atau operasional saat ini. Overpass dapat timeout; TTL 1 jam.

## 11. Global Bike Share

https://getra-routing-api.tail0ed517.ts.net:8443/international/bikeshare

Menampilkan stasiun sepeda dan status yang dipublikasikan operator.

1. Cari kota/operator, lalu tekan Muat data untuk mengambil katalog GBFS.
2. Pilih Sistem GBFS dan tekan Muat data lagi; contoh yang diuji: Citi Bike NYC (lyft_nyc).
3. Klik stasiun untuk available bikes, available docks, is_renting/is_returning dan last_reported.
4. Perhatikan status STALE, nilai yang tidak dipublikasikan dan TTL operator.

Batas: Pemilihan sistem memuat feed operator hingga 3000 record; radius belum memfilter seluruh feed. Pricing/geofencing belum tersedia. Katalog bukan jaminan feed aktif.

## 12. Shared Micromobility

https://getra-routing-api.tail0ed517.ts.net:8443/international/micromobility

Memetakan skuter, moped atau cargo bike yang dipublikasikan operator.

1. Muat katalog, cari operator dan pilih Sistem GBFS.
2. Muat kembali untuk mengambil kendaraan; contoh uji: Dott Berlin.
3. Klik kendaraan untuk tipe, reservation/disabled status, station ID dan baterai/range bila tersedia.
4. Jika Truncated muncul, jumlah yang tampil merupakan batas hasil, bukan ukuran total armada.

Batas: Maksimum 3000 record; nilai baterai yang hilang tetap unknown. Tidak semua bentuk feed operator didukung; zona geofencing belum ditampilkan.

## 13. EV Charging Map

https://getra-routing-api.tail0ed517.ts.net:8443/international/ev-charging

Menemukan lokasi pengisian kendaraan listrik yang tercatat.

1. Pilih pusat pencarian dan radius, lalu muat data.
2. Buka detail untuk connector/socket tags, capacity, operator, access dan jam operasional bila tersedia.
3. Gunakan tautan rute untuk menuju koordinat lokasi.
4. Baca LOCATION KNOWN sebagai lokasi tercatat, bukan charger kosong atau tersedia sekarang.

Batas: Tidak ada sumber ketersediaan charger real-time yang terhubung. Kondisi terbaru harus dikonfirmasi ke operator. TTL 1 jam.

## 14. Global Public Transit POI

https://getra-routing-api.tail0ed517.ts.net:8443/international/transit-stops

Menampilkan titik bus, rail/tram, ferry dan airport dari OSM.

1. Pilih lokasi dan radius, lalu muat data transit.
2. Perbesar cluster dan klik titik untuk nama, tipe dan tag provider.
3. Gunakan Rute ke lokasi ini; perencana GETRA menerima koordinat tujuan.
4. Tentukan titik asal dan moda pada peta utama sebelum memulai perjalanan.

Batas: Layer ini berisi inventaris lokasi, bukan jadwal keberangkatan atau posisi kendaraan langsung. TTL 1 jam.

## 15. DKI Public Transport

https://getra-routing-api.tail0ed517.ts.net:8443/international/jakarta-transit

Menggunakan inventaris halte dari sumber resmi DKI.

1. Pilih koordinat di DKI Jakarta dan radius pencarian.
2. Tekan Muat data / Retry untuk menjalankan spatial query ArcGIS.
3. Klik halte untuk atribut, koordinat, tipe dan sumber resminya.
4. Gunakan route handoff jika ingin menyusun perjalanan menuju halte.

Batas: Integrasi saat ini khusus Halte Transjakarta. Layer KRL/bandara dan posisi kendaraan live belum digabung. Update inventory tidak dipublikasikan; cache 24 jam.

## 16. DKI Flood & Water Level

https://getra-routing-api.tail0ed517.ts.net:8443/international/flood

Menyiapkan konsumsi pengamatan banjir/tinggi muka air resmi dengan status asli provider.

1. Operator harus menyediakan feed resmi terverifikasi melalui DKI_FLOOD_GEOJSON_URL.
2. Pilih lokasi/radius dan muat data setelah sumber terhubung.
3. Jika ada pengamatan, baca timestamp, official_status dan thresholds dari provider.
4. Jika UNAVAILABLE tampil, tidak ada kesimpulan kondisi banjir yang dapat dibuat.

Batas: DATA SOURCE NOT CONNECTED pada audit ini. Tidak ada NORMAL/WASPADA/SIAGA/BAHAYA hasil rekaan. Belum memenuhi acceptance data live.

## 17. DKI Disaster Map

https://getra-routing-api.tail0ed517.ts.net:8443/international/disaster

Menyiapkan tampilan insiden berdasarkan jenis, tahun dan waktu dari dataset resmi.

1. Operator menghubungkan dataset BPBD resmi melalui DKI_DISASTER_GEOJSON_URL.
2. Pilih tahun, jenis insiden dan rentang waktu yang diperlukan.
3. Muat data dan buka record untuk waktu, lokasi, district serta atribut sumber yang tersedia.
4. UNAVAILABLE menunjukkan feed belum terhubung; peta kosong bukan bukti nihil bencana.

Batas: Dataset aktual belum terhubung. Kontrak saat ini menerima point incidents WGS84; bukan dashboard tanggap darurat live.

## 18. BMKG Weather Radar

https://getra-routing-api.tail0ed517.ts.net:8443/international/weather-radar

Menampilkan overlay radar yang mempunyai georeference dan metadata resmi.

1. Buka layer radar dan tekan Muat data / Retry.
2. Jika provider tersedia dan metadata valid, overlay serta legend akan muncul.
3. Atur Opasitas untuk membandingkan radar dengan basemap.
4. Periksa waktu citra; saat ERROR/timeout, ulangi nanti dan jangan menganggap tidak ada hujan.

Batas: Endpoint resmi mengembalikan HTTP 522/timeout pada audit sebelumnya. Belum ada radar live/animasi yang diterima lulus; bounds tidak ditebak.

## 19. BMKG Satellite Weather

https://getra-routing-api.tail0ed517.ts.net:8443/international/weather-satellite

Menyiapkan tampilan citra awan dengan batas spasial, waktu dan legend yang dapat diverifikasi.

1. Operator menyediakan BMKG_SATELLITE_MANIFEST_URL pada domain resmi.
2. Manifest harus memuat URL citra, empat koordinat batas, timestamp dan legend.
3. Muat layer; jika valid, baca waktu citra dan atur opacity.
4. UNAVAILABLE berarti sumber belum tersambung, bukan langit cerah.

Batas: Manifest resmi terverifikasi belum tersedia. Gambar publik tanpa bounds/time tidak ditempel sebagai overlay dengan georeference buatan.

## 20. Global Open Data Explorer

https://getra-routing-api.tail0ed517.ts.net:8443/international/open-data

Mengakses dataset yang telah diintegrasikan melalui satu panel.

1. Pada Dataset, pilih sumber fungsional, misalnya Earthquake, POI atau Weather.
2. Atur lokasi, radius, kategori/magnitudo/kode desa sesuai dataset; rentang waktu bersifat opsional.
3. Tekan Muat data. Sumber, lisensi, freshness dan timestamp mengikuti adapter yang dipilih.
4. Gunakan Interpretasi berbasis data untuk ringkasan hasil dari tool provider.

Batas: Bukan katalog lengkap semua open data global. Status AUTH_REQUIRED/UNAVAILABLE tetap berlaku sesuai dataset. Filter waktu mengecualikan record tanpa timestamp.

## Rute, Journey dan usaha

Pada /app tentukan asal/tujuan dan moda jalan kaki, motor atau mobil; hasil bergantung cakupan Valhalla. Mulai Journey memakai izin lokasi dan pembaruan GPS. Uji otomatis memakai GPS emulasi, bukan perjalanan fisik. Area jalan kaki menampilkan kontur jaringan bila graph RPC tidak tersedia.

/umkm menyediakan daftar/detail usaha. Klaim kepemilikan harus diverifikasi sebelum mengubah data atau mengaktifkan promosi. /umkm/advertising mengelola kampanye menurut izin; pembayaran nyata tidak dijalankan pada audit ini. /community memakai autentikasi dan moderasi yang ada. Halaman konsep lama berlabel SIMULATION dan memerlukan opt-in eksplisit; bukan feed produksi.
