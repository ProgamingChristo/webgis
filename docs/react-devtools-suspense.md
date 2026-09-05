Error Suspense dari React Developer Tools

Pesan: `We are cleaning up async info that was not on the parent Suspense boundary. This is a bug in React.`

Pada pemeriksaan 5 September 2026, stack trace berasal dari ekstensi Edge `gpphkfbcpidddadnkolkpfckpihlkkil`, file `build/installHook.js`. Manifest ekstensi yang terpasang menunjukkan React Developer Tools 7.0.1, build 20 Oktober 2025. Pesan persis tersebut ditemukan dalam bundle ekstensi.

GETRA memakai Next.js 16.3.1. React/ReactDOM pada package root adalah 19.2.8; runtime React App Router yang dibundel Next adalah `19.3.0-canary-cbb046ab-20260731`. Konsumen `useSearchParams` pada halaman UMKM sudah berada dalam Suspense sebagaimana panduan Next yang terpasang. Error ini terjadi pada pencatatan boundary oleh DevTools.

Untuk melanjutkan pengembangan melalui VS Code:

1. Jalankan server seperti biasa dengan `npm run dev`, atau gunakan server GETRA yang sudah berjalan.
2. Buka Run and Debug, pilih **GETRA: Edge tanpa ekstensi**, lalu tekan F5.
3. Masuk ke akun GETRA pada jendela debug tersebut. Profil sementara memiliki sesi login sendiri.

Konfigurasi [.vscode/launch.json](../.vscode/launch.json) menggunakan profil sementara debugger dan `--disable-extensions`. Sesuaikan URL apabila frontend berjalan pada port selain 3000. Profil Edge utama tidak diubah. Breakpoint JavaScript dan browser DevTools bawaan tetap tersedia; panel dari ekstensi React Developer Tools tidak dimuat pada sesi ini.

Untuk mengatasi error pada jendela Edge utama yang sudah digunakan:

1. Buka `edge://extensions/`.
2. Nonaktifkan **React Developer Tools** dengan ID di atas.
3. Muat ulang tab GETRA agar hook yang sudah terinjeksi ikut hilang.

Perubahan ini merupakan workaround pada lingkungan debug. Bug upstream pada ekstensi tidak dipatch oleh repository GETRA. Strict Mode, Suspense, versi dependency, dan pelaporan error aplikasi tetap dipertahankan. Ekstensi dapat dicoba kembali setelah pembaruan yang memperbaiki masalah ini tersedia.

Verifikasi: konfigurasi JSON berhasil dibaca, lalu Edge 152.0.4191.62 dijalankan headless dengan profil sementara dan argumen yang sama. Halaman `/`, `/login`, dan `/signup` mengembalikan 200; `/umkm` mengarahkan sesi tanpa login ke `/login`. Tidak ditemukan console error atau page error pada pemeriksaan ini. Navigasi workspace setelah login tidak diuji pada pemeriksaan browser ini. Hasil tersimpan di `outputs/devtools-suspense/results.json`.

Referensi: [laporan error yang sama pada repository Next.js](https://github.com/vercel/next.js/discussions/84973), [React DevTools changelog](https://github.com/facebook/react/blob/main/packages/react-devtools/CHANGELOG.md), dan [opsi debugger Microsoft](https://github.com/microsoft/vscode-js-debug/blob/main/OPTIONS.md).
