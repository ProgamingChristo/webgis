# GETRA Branch Governance & Team Git Workflow

> **Authority Statement**:  
> Mulai 14 September 2026, branch **`Getra_Deploy`** resmi menjadi **DEFAULT BRANCH** dan **SINGLE SOURCE OF TRUTH (Satu-satunya Sumber Kebenaran Utama)** untuk seluruh anggota tim GETRA.
> 
> Seluruh proses:
> - PULL kode terbaru
> - PUSH fitur/perbaikan
> - FEATURE INTEGRATION
> - BUGFIX INTEGRATION
> - UI UPDATE INTEGRATION
> - RELEASE PREPARATION
> 
> **Wajib** berakar dari dan kembali ke **`Getra_Deploy`**.

---

## 1. Status Cabang (Branch Roles)

| Nama Branch | Status | Fungsi & Aturan |
|:---|:---|:---|
| **`Getra_Deploy`** | **PRIMARY DEFAULT (Source of Truth)** | Branch utama produksi dan integrasi harian seluruh tim. Default branch di GitHub. |
| **`finalmerge`** | **RETAINED (Historical / Compatibility)** | Branch arsip integrasi. Disinkronkan dengan `Getra_Deploy`. Tidak digunakan sebagai default. |
| **`core-prd-sprint`** | **RETAINED (PRD Baseline)** | Branch baseline PRD & sprint. Disinkronkan dengan `Getra_Deploy`. Tidak digunakan sebagai default. |
| **`UMKM`** | **RETAINED (Specialist / Legacy)** | Cabang spesialis referensi UMKM. Jangan membuat branch baru dari sini. |
| **`AIgetra`** | **RETAINED (Specialist / AI Lab)** | Cabang eksperimen AI. Seluruh fitur yang stabil wajib di-port ke `Getra_Deploy`. |

> [!WARNING]
> **DILARANG KERAS** membuat branch fitur baru dari branch lama seperti `main`, `develop`, `UMKM`, atau branch backup. Semua pekerjaan baru **HARUS** dicabangkan dari `Getra_Deploy`.

---

## 2. Alur Kerja Harian Tim (Team Daily Workflow)

### A. Memulai Hari / Update Kode Terbaru (Pull)
Sebelum mulai ngoding atau membuat fitur baru, selalu pastikan repositori lokal Anda mutakhir:

```bash
# 1. Ambil seluruh referensi terbaru dari GitHub
git fetch origin

# 2. Pindah ke branch Getra_Deploy
git checkout Getra_Deploy

# 3. Tarik perubahan terbaru (fast-forward only)
git pull --ff-only origin Getra_Deploy
```

---

### B. Membuat Fitur Baru / Perbaikan Bug (Branching)
Gunakan konvensi penamaan branch yang jelas:
- Fitur baru: `feat/<nama-fitur>`
- Perbaikan bug: `fix/<nama-bug>`
- Refactor/UI: `refactor/<nama-tugas>`

```bash
# Buat dan pindah ke branch baru berbasis Getra_Deploy
git checkout -b feat/tambah-filter-kategori Getra_Deploy
```

---

### C. Bekerja dan Melakukan Commit
Lakukan perubahan, pastikan kode rapi dan teruji:

```bash
git add <file-yang-diubah>
git commit -m "feat(discovery): tambah filter kategori kuliner halal"
```

---

### D. Menjalankan Quality Gate Lokal Sebelum Push
Sebelum push ke remote, pastikan tidak ada error tipe, lint, atau test yang gagal:

```bash
# Uji Frontend
cd frontend
npm run typecheck
npm run lint
npm test

# Uji Backend
cd ../backend
npm run typecheck
npm run lint
npm test
```

Semua pengujian harus **100% PASS (0 failure)**.

---

### E. Push Branch ke GitHub & Buat Pull Request (PR)
Push branch Anda ke GitHub:

```bash
git push -u origin feat/tambah-filter-kategori
```

Buka GitHub (`https://github.com/ProgamingChristo/webgis`) dan buat **Pull Request (PR)**:
- **Base branch**: `Getra_Deploy`
- **Compare branch**: `feat/tambah-filter-kategori`

Setelah direview dan lolos verifikasi, merge PR ke dalam **`Getra_Deploy`**.

---

## 3. Aturan Keselamatan (Safety Rules)

Berikut adalah perintah dan tindakan yang **DIHARAMKAN** di repositori GETRA:

1. **DILARANG `git push --force` atau `--force-with-lease`** ke `Getra_Deploy`.
2. **DILARANG `git reset --hard`** pada commit publik yang sudah di-push.
3. **DILARANG menghapus branch tanpa audit** kelayakan atau tanpa izin owner.
4. **DILARANG blind merge** (merge mentah tanpa memeriksa potensi regresi visual/GIS).
5. **DILARANG meninggalkan uncommitted work** saat berpindah tugas.

---

## 4. Kontrak Inti Produk yang Terkunci (Locked Product Contracts)

Setiap integrasi kode wajib mematuhi aturan arsitektur GETRA:
1. **GIS COMPUTES, AI INTERPRETS**: Perhitungan rute, radius isochrone, dan geocoding dilakukan oleh PostGIS & pgRouting di backend. AI LLM hanya bertugas menerjemahkan intent bahasa manusia.
2. **DATA VERIFIED != OWNER VERIFIED**: Status verifikasi data lapangan berbeda dengan verifikasi kepemilikan UMKM.
3. **JAKARTA STUDY AREA**: Viewport default peta selalu berpusat pada area DKI Jakarta (`106.85, -6.25`), bukan Padang atau koordinat acak.
4. **ATOMIC ADMIN APPROVAL**: Persetujuan UMKM di admin queue harus idempotens dan mempublikasikan data ke katalog kanonikal tanpa duplikasi marker.
