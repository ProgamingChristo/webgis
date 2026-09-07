Implementasi UX workspace UMKM — branch `finalmerge`, 5 September 2026.

Perubahan diterapkan langsung pada implementasi existing. Authorization USER/ADMIN, stakeholder mode UMKM, sumber merchant GETRA/MAPID/Menu Go, proses review admin, dan lifecycle promosi dipertahankan. Perubahan lain yang sudah ada di working tree sebelum tugas ini tidak diubah.

1. Masalah yang ditemukan

- `/umkm` menampilkan ringkasan metrik dan tiga kartu fitur sebelum memiliki usaha; status pengajuan tidak menentukan pengalaman halaman.
- Intelligence dan promosi memiliki pilihan usaha sendiri. URL usaha pada promosi diabaikan, dan respons request lama dapat menampilkan konteks usaha sebelumnya.
- Ringkasan hanya mengambil 10 pengajuan/klaim; pengajuan lama yang masih berjalan dapat tersembunyi. Query workflow yang gagal dianggap kosong.
- Daftar usaha promosi dibatasi 20 record. Analytics memperlakukan respons `my-merchants` sebagai array, padahal kontraknya object.
- Approval menyimpan kategori pada `metadata.category_label`, media pada `metadata.public_media`, serta kontak/harga pada `metadata.business_info`. Sebagian pembaca ringkasan dan diagnosis tidak membaca struktur tersebut.
- Pembacaan lokasi draft tidak mendukung EWKB PostGIS dan mengganti nilai yang tidak dikenal dengan koordinat Jakarta. Penyimpanan kembali draft berisiko mengubah lokasi aslinya.

2. State flow final

State diturunkan dari `owned_merchants`, `recent_submissions`, dan `recent_claims`, tanpa menggunakan aggregate counter sebagai bukti kepemilikan.

| Kondisi data | State UX | Pengalaman |
| --- | --- | --- |
| Tidak ada usaha, draft, atau proses review aktif | `NO_MERCHANT` | Onboarding singkat, satu CTA Daftarkan / Klaim Usaha |
| Tidak ada usaha/pending, ada DRAFT | `HAS_DRAFT` | Lanjutkan Pendaftaran menuju draft terbaru; pendaftaran usaha lain sebagai secondary action |
| Tidak ada usaha, ada PENDING_REVIEW atau klaim PENDING | `PENDING_VERIFICATION` | Nama, jenis pengajuan, tanggal dibuat/diperbarui, status, detail, dan langkah berikutnya |
| Ada usaha milik user, tanpa review lain | `ACTIVE_MERCHANT` | Overview, Usaha Saya, Visibilitas, Peluang di Sekitar, Promosi |
| Ada usaha milik user dan review lain | `ACTIVE_WITH_PENDING` | Workspace aktif; pengajuan lain ditampilkan sesudah workspace |

Pending didahulukan dari draft ketika belum ada usaha. Riwayat APPROVED tidak memberikan akses tanpa kepemilikan aktual. REJECTED/CANCELLED tidak dianggap pending. Riwayat tetap dapat dibuka dalam section tambahan.

Satu `selectedMerchantId` mengendalikan diagnosis, periode pengamatan, penjelasan AI, kesiapan promosi, dan tautan promosi. Pilihan disimpan dalam URL `merchantId`; section memakai hash `overview`, `usaha-saya`, `visibilitas`, `peluang`, atau `promosi`. Satu usaha dipilih otomatis; pilihan yang tidak lagi dimiliki kembali ke usaha tersedia. Hasil request lama langsung disembunyikan ketika konteks berubah. Segarkan dan kembali ke tab browser memuat ulang ringkasan; keberhasilan refresh juga memperbarui diagnosis dan eligibility.

Overview menampilkan identitas, kategori, status tayang/verifikasi aktual, kesiapan profil, jumlah promosi berstatus ACTIVE untuk usaha terpilih, dan tindakan dari diagnosis yang tersedia. Tidak ada perkiraan pencarian, omzet, pelanggan, atau ROI buatan.

Pendaftaran tetap memakai service dan payload existing. Pencarian usaha ditampilkan pertama. Klaim memakai merchant yang ditemukan dan bukti kepemilikan existing. REGISTER terdiri dari enam controlled sections: Identitas, Lokasi, Operasional, Menu & Harga, Foto & Preview, Verifikasi. Field, file upload, dan draft tetap berada di state komponen induk. Validasi mengarahkan pengguna kembali ke section yang relevan.

3. API dan backend yang direuse

| Kebutuhan | Kontrak existing |
| --- | --- |
| Ringkasan dan kepemilikan workspace | `GET /api/umkm/workspace`, `merchants.owner_id` |
| Pencarian merchant lintas sumber | `GET /api/merchants/canonical` melalui service pencarian existing |
| Status/klaim dan bukti kepemilikan | `/api/merchants/[id]/ownership` |
| Draft, edit, upload, submit, cancel | `/api/umkm/merchant-submissions`, `/[id]`, `/photo`, `/[id]/submit`, `/[id]/cancel` |
| Review admin | `/api/admin/merchant-claims/**`, `/api/admin/merchant-submissions/**`, RPC approval existing |
| Diagnosis dan konteks pasar | `GET /api/umkm/intelligence?merchant_id=…&days=…` |
| Penjelasan contextual | `POST /api/umkm/intelligence/copilot`; AI deskripsi existing tetap di form |
| Daftar usaha dan eligibility promosi | `/api/umkm/advertising/my-merchants`, `/api/umkm/advertising/eligibility` |
| Campaign, creative, targeting, schedule, pembayaran, analytics | Service dan `/api/umkm/advertising/campaigns/**` existing |
| Permintaan komuter | Tautan `/community?view=requests` ke pengalaman Community existing |

4. Perubahan kontrak dan schema

Tidak ada endpoint baru, migration, perubahan tabel, atau perubahan role/auth. Kontrak workspace mendapat field additive `owned_merchants[].active_campaigns_count` (optional di type untuk kompatibilitas respons lama). Nilainya dihitung dari status campaign aktual; field aggregate existing dipertahankan. Frontend menampilkan “Belum tersedia” jika field baru belum dikirim backend.

Array `recent_submissions` dan `recent_claims` sekarang mempertahankan semua workflow terbuka ditambah maksimal 10 riwayat selesai per jenis. Klaim APPROVED dapat ditampilkan sebagai riwayat; detail klaim diperbaiki agar status tersebut tidak ditampilkan sebagai ditolak. Query ringkasan menggunakan pagination untuk workflow, usaha, dan campaign; kegagalan query tidak disamarkan sebagai state kosong atau angka nol.

Parser lokasi draft mendukung GeoJSON, WKT, WKB/EWKB 2D SRID 4326 dan menolak data rusak dengan error yang aman. Payload lokasi dan schema database tetap sama.

5. Approval menuju workspace/promosi

Audit SQL existing menunjukkan approval menetapkan `owner_id` kepada pengaju/klaiman secara atomik; reviewer tidak menjadi pemilik. Approval pendaftaran mengaktifkan status PUBLISHED/VERIFIED. Approval klaim mempertahankan status publikasi existing, sehingga usaha yang belum tayang dapat tetap ditolak eligibility dengan alasan MERCHANT_INACTIVE.

Perbaikan integrasi meliputi pagination `my-merchants`, pembacaan struktur hasil approval, pemeliharaan merchantId pada halaman/link, perbaikan kontrak analytics, dan isolasi respons async eligibility/analytics. Tidak ada hardcode merchant atau duplikasi aturan eligibility frontend. CTA pendaftaran yang disetujui menuju pemeriksaan kesiapan promosi di workspace sebelum pembuatan campaign.

6. Verifikasi

- `npm run lint`: lulus frontend dan backend; file final yang berubah setelahnya juga diperiksa dengan scoped ESLint.
- `npm run typecheck`: lulus frontend, backend, dan root.
- `npm run build`: lulus production build Next.js frontend dan backend.
- `npm run test`: 35 file / 150 tes frontend lulus; 139 file / 899 tes backend lulus, 2 file / 3 tes backend dilewati sesuai konfigurasi existing.
- Test tambahan mencakup seluruh state, prioritas pending/draft, klaim approved tanpa ownership, selected merchant, next action, jumlah campaign per usaha, eligibility, draft/step validation, pagination, kegagalan query, dan pembacaan evidence hasil approval serta lokasi EWKB.
- Browser terisolasi dengan komponen dan hooks asli: 4 kelompok alur pendaftaran dan 5 kelompok workspace lulus. Mencakup search/claim/evidence, stepper/register/upload/submit, edit-draft, invalidasi hasil pencarian, semua state, pergantian usaha, reset penjelasan AI/periode, eligibility, serta refresh usaha yang sama.
- Layout diperiksa pada lebar desktop 1440px dan mobile 390px tanpa horizontal overflow; tidak ada page error.

Laporan browser dan screenshot tersedia di `outputs/umkm-submission-review/`, termasuk `browser-results.json` dan `workspace-browser-results.json`. Fixture hanya berada dalam output pengujian yang diabaikan git; tidak dimasukkan ke production. Pengujian browser memakai service fixture dan tidak mencakup login shell, render peta asli, atau transaksi approval pada database nyata.

7. Batas implementasi/data nyata

- Intelligence belum mengekspos diagnosis metode pembayaran atau pintu masuk. UI menyebutkan bahwa pemeriksaan tersebut belum tersedia.
- Endpoint edit profil usaha yang sudah diverifikasi belum tersedia. Diagnosis tetap menyebutkan field yang perlu dilengkapi dan mengarahkan tindak lanjut melalui admin; tidak dibuat flow edit atau endpoint baru.
- Demand/retail gap/daftar usaha sejenis berasal dari kategori dan kota administratif. UI menjelaskan cakupan ini; angka tidak dipresentasikan sebagai kebutuhan dalam radius toko.
- Request Board belum mendukung filter merchant/location. Tautan ke permintaan komuter secara eksplisit menjelaskan bahwa daftar belum disaring menurut usaha terpilih.
- Jam operasional dipakai sebagai bukti kesiapan. Status buka saat ini tidak dikarang karena ringkasan tidak menyediakannya.
- Klaim/pendaftaran masih memerlukan review admin. Eligibility API tetap menjadi sumber keputusan; materi, sasaran, jadwal, dan pembayaran mengikuti readiness/lifecycle campaign existing.
- Tidak dilakukan approval, pembayaran, atau perubahan data produksi untuk pengujian ini. Pengujian integrasi backend menggunakan fixture/mocks existing; validasi terhadap database dan akun nyata masih merupakan pemeriksaan operasional terpisah.

8. Inventaris file

Daftar lengkap file implementasi dan test di bawah mengecualikan perubahan yang sudah ada sebelum tugas ini.

| Status | File |
| --- | --- |
| Diubah | `backend/app/api/umkm/advertising/my-merchants/route.ts` |
| Diubah | `backend/src/features/merchant-submission/repositories/merchant-submission.repository.ts` |
| Baru | `backend/src/features/merchant-submission/repositories/submission-point.ts` |
| Diubah | `backend/src/features/umkm-intelligence/umkm-copilot.service.ts` |
| Diubah | `backend/src/features/umkm-intelligence/umkm-intelligence.service.ts` |
| Diubah | `backend/src/features/umkm-workspace/services/umkm-workspace.service.ts` |
| Diubah | `backend/src/features/umkm-workspace/types/umkm-workspace.types.ts` |
| Baru | `backend/tests/integration/advertising-my-merchants-route.test.ts` |
| Diubah | `backend/tests/unit/merchant-submission/merchant-submission.service.test.ts` |
| Baru | `backend/tests/unit/merchant-submission/submission-point.test.ts` |
| Diubah | `backend/tests/unit/security/phase10-ownership-hardening.test.ts` |
| Diubah | `backend/tests/unit/umkm-intelligence/umkm-copilot.service.test.ts` |
| Baru | `backend/tests/unit/umkm-intelligence/umkm-intelligence-profile-evidence.test.ts` |
| Diubah | `backend/tests/unit/umkm-workspace/umkm-workspace.service.test.ts` |
| Diubah | `frontend/app/umkm/advertising/page.tsx` |
| Diubah | `frontend/app/umkm/merchants/new/page.tsx` |
| Diubah | `frontend/app/umkm/page.tsx` |
| Diubah | `frontend/src/components/getra-ui/getra-unified-app-shell.tsx` |
| Baru | `frontend/src/features/merchant-submission/components/merchant-registration-steps.tsx` |
| Diubah | `frontend/src/features/merchant-submission/components/merchant-submission-detail.tsx` |
| Diubah | `frontend/src/features/merchant-submission/components/merchant-submission-form.tsx` |
| Baru | `frontend/src/features/merchant-submission/services/merchant-registration-validation.ts` |
| Diubah | `frontend/src/features/umkm-advertising/analytics/components/analytics-dashboard.tsx` |
| Baru | `frontend/src/features/umkm-advertising/analytics/services/merchant-campaigns.service.ts` |
| Diubah | `frontend/src/features/umkm-advertising/components/advertising-eligibility-gate.tsx` |
| Diubah | `frontend/src/features/umkm-advertising/components/campaign/campaign-card.tsx` |
| Diubah | `frontend/src/features/umkm-advertising/components/campaign/campaign-create-form.tsx` |
| Diubah | `frontend/src/features/umkm-advertising/components/campaign/campaign-list.tsx` |
| Diubah | `frontend/src/features/umkm-advertising/hooks/use-advertising-eligibility.ts` |
| Diubah | `frontend/src/features/umkm-advertising/services/advertising-eligibility.service.ts` |
| Baru | `frontend/src/features/umkm-advertising/utils/promotion-requirement.ts` |
| Dihapus | `frontend/src/features/umkm-intelligence/components/umkm-intelligence-dashboard.tsx` |
| Diubah | `frontend/src/features/umkm-intelligence/components/umkm-intelligence-map.tsx` |
| Baru | `frontend/src/features/umkm-intelligence/hooks/use-umkm-insight-explanation.ts` |
| Diubah | `frontend/src/features/umkm-intelligence/hooks/use-umkm-intelligence.ts` |
| Diubah | `frontend/src/features/umkm-intelligence/index.ts` |
| Baru | `frontend/src/features/umkm-intelligence/utils/readiness-presentation.ts` |
| Diubah | `frontend/src/features/umkm-workspace/components/merchant-claim-detail.tsx` |
| Baru | `frontend/src/features/umkm-workspace/components/merchant-opportunity-panel.tsx` |
| Baru | `frontend/src/features/umkm-workspace/components/merchant-selector.tsx` |
| Baru | `frontend/src/features/umkm-workspace/components/merchant-visibility-panel.tsx` |
| Diubah | `frontend/src/features/umkm-workspace/components/owned-merchant-list.tsx` |
| Baru | `frontend/src/features/umkm-workspace/components/promotion-readiness-card.tsx` |
| Diubah | `frontend/src/features/umkm-workspace/components/submission-summary.tsx` |
| Baru | `frontend/src/features/umkm-workspace/components/umkm-active-workspace.tsx` |
| Baru | `frontend/src/features/umkm-workspace/components/umkm-entry-state.tsx` |
| Baru | `frontend/src/features/umkm-workspace/components/umkm-overview.tsx` |
| Baru | `frontend/src/features/umkm-workspace/components/umkm-pending-state.tsx` |
| Baru | `frontend/src/features/umkm-workspace/components/umkm-workspace-navigation.tsx` |
| Diubah | `frontend/src/features/umkm-workspace/components/umkm-workspace.tsx` |
| Baru | `frontend/src/features/umkm-workspace/hooks/use-umkm-workspace.ts` |
| Baru | `frontend/src/features/umkm-workspace/model/umkm-workspace-state.ts` |
| Diubah | `frontend/src/features/umkm-workspace/services/umkm-workspace.service.ts` |
| Diubah | `frontend/src/features/umkm-workspace/types/umkm-workspace.types.ts` |
| Baru | `frontend/tests/umkm-intelligence/merchant-insight-panels.test.tsx` |
| Diubah | `frontend/tests/umkm-intelligence/umkm-intelligence-contract.test.ts` |
| Baru | `frontend/tests/umkm-workspace/merchant-campaigns.test.ts` |
| Baru | `frontend/tests/umkm-workspace/merchant-submission-flow.test.tsx` |
| Baru | `frontend/tests/umkm-workspace/promotion-readiness.test.tsx` |
| Baru | `frontend/tests/umkm-workspace/workspace-state.test.tsx` |
