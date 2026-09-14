const { chromium } = require('D:/Antigravity IDE/resources/app/node_modules/playwright');
const fs = require('fs');
const path = require('path');

const outputPath = 'D:\\getra docs\\Production docs\\GETRA_PANDUAN_GIT_WORKFLOW_TIM.pdf';

const htmlContent = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>Panduan Resmi Git Workflow Tim GETRA</title>
  <style>
    @page {
      size: A4;
      margin: 18mm 16mm 20mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      line-height: 1.5;
      font-size: 10pt;
      margin: 0;
      padding: 0;
    }
    .header-badge {
      display: inline-block;
      background: #0284c7;
      color: white;
      font-size: 8pt;
      font-weight: 700;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      padding: 4px 10px;
      border-radius: 9999px;
      margin-bottom: 8px;
    }
    h1 {
      color: #032b43;
      font-size: 20pt;
      margin: 0 0 4px;
      line-height: 1.2;
    }
    .subtitle {
      font-size: 11pt;
      color: #64748b;
      margin-bottom: 18px;
      font-weight: 500;
    }
    .rule-box {
      background: #f0f9ff;
      border: 1.5px solid #bae6fd;
      border-left: 5px solid #0284c7;
      border-radius: 6px;
      padding: 12px 16px;
      margin: 14px 0 20px;
    }
    .rule-box h3 {
      margin: 0 0 6px;
      color: #0369a1;
      font-size: 11pt;
    }
    .rule-box p {
      margin: 0;
      font-size: 9.5pt;
      color: #0c4a6e;
    }
    .warning-box {
      background: #fef2f2;
      border: 1.5px solid #fecaca;
      border-left: 5px solid #ef4444;
      border-radius: 6px;
      padding: 12px 16px;
      margin: 14px 0;
    }
    .warning-box h3 {
      margin: 0 0 6px;
      color: #b91c1c;
      font-size: 10.5pt;
    }
    .warning-box ul {
      margin: 0;
      padding-left: 20px;
      color: #7f1d1d;
      font-size: 9pt;
    }
    h2 {
      color: #0f2744;
      font-size: 13pt;
      border-bottom: 1.5px solid #e2e8f0;
      padding-bottom: 4px;
      margin: 22px 0 10px;
      page-break-after: avoid;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 10px 0 16px;
      font-size: 8.8pt;
      page-break-inside: avoid;
    }
    th, td {
      border: 1px solid #cbd5e1;
      padding: 7px 10px;
      text-align: left;
    }
    th {
      background-color: #f8fafc;
      color: #1e293b;
      font-weight: 700;
    }
    tr:nth-child(even) td {
      background-color: #fbfcfe;
    }
    .status-badge {
      display: inline-block;
      font-size: 7.5pt;
      font-weight: 700;
      padding: 2px 7px;
      border-radius: 4px;
    }
    .badge-primary { background: #dbeafe; color: #1e40af; }
    .badge-retained { background: #f1f5f9; color: #475569; }
    .badge-specialist { background: #fef3c7; color: #92400e; }

    pre {
      background: #09131d;
      color: #f1f5f9;
      padding: 10px 14px;
      border-radius: 6px;
      font-family: Consolas, "Courier New", monospace;
      font-size: 8.5pt;
      line-height: 1.45;
      margin: 8px 0 14px;
      overflow-x: hidden;
      page-break-inside: avoid;
    }
    code {
      font-family: Consolas, "Courier New", monospace;
      font-size: 8.8pt;
      background: #f1f5f9;
      color: #0284c7;
      padding: 2px 5px;
      border-radius: 4px;
    }
    pre code {
      background: transparent;
      color: inherit;
      padding: 0;
    }
    .step-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 10px 14px;
      margin-bottom: 10px;
      page-break-inside: avoid;
    }
    .step-num {
      display: inline-block;
      background: #0284c7;
      color: white;
      font-weight: bold;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      text-align: center;
      line-height: 18px;
      font-size: 8pt;
      margin-right: 6px;
    }
    .step-title {
      font-weight: 700;
      color: #0f172a;
      font-size: 9.5pt;
    }
    .cheatsheet-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin: 12px 0;
    }
    .cheat-box {
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 10px 12px;
      background: #f8fafc;
      page-break-inside: avoid;
    }
    .cheat-title {
      font-size: 8.5pt;
      font-weight: 700;
      color: #0284c7;
      text-transform: uppercase;
      margin-bottom: 6px;
    }
    .cheat-box pre {
      margin: 0;
      padding: 6px 8px;
      font-size: 8pt;
    }
    .footer-note {
      border-top: 1px solid #e2e8f0;
      margin-top: 24px;
      padding-top: 10px;
      font-size: 8pt;
      color: #64748b;
      text-align: center;
    }
  </style>
</head>
<body>

  <div class="header-badge">GETRA REPOSITORY GOVERNANCE &bull; 14 SEPTEMBER 2026</div>
  <h1>🚀 Panduan Resmi Git Workflow Tim GETRA</h1>
  <div class="subtitle">Standar Operasional Cabang (Branch Governance) & Alur Kerja Terpadu Seluruh Anggota Tim</div>

  <div class="rule-box">
    <h3>📌 Keputusan Owner: Single Source of Truth</h3>
    <p>
      Mulai hari ini, repositori kita telah distandardisasi. Branch <strong><code>Getra_Deploy</code></strong> resmi menjadi <strong>DEFAULT BRANCH</strong> dan <strong>SUMBER KEBENARAN TUNGGAL</strong> untuk seluruh anggota tim. Seluruh proses pull, push, implementasi fitur baru, perbaikan bug, dan rilis WAJIB berakar dari dan kembali ke <strong><code>Getra_Deploy</code></strong>.
    </p>
  </div>

  <div class="warning-box">
    <h3>⚠️ Peringatan Penting untuk Rekan Tim:</h3>
    <ul>
      <li><strong>JANGAN LAGI membuat branch dari branch lama</strong> seperti <code>main</code>, <code>develop</code>, <code>UMKM</code>, atau branch backup.</li>
      <li><strong>JANGAN membuat branch baru tanpa koordinasi</strong> atau dengan penamaan sembarangan.</li>
      <li><strong>DILARANG MELAKUKAN <code>git push --force</code></strong> ke <code>Getra_Deploy</code> maupun ke branch tim lainnya.</li>
    </ul>
  </div>

  <h2>🌳 1. Status Cabang Repositori</h2>
  <table>
    <thead>
      <tr>
        <th style="width: 22%;">Nama Branch</th>
        <th style="width: 20%;">Status</th>
        <th>Fungsi & Aturan Penggunaan</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Getra_Deploy</strong></td>
        <td><span class="status-badge badge-primary">🌟 PRIMARY DEFAULT</span></td>
        <td><strong>Branch Utama (Single Source of Truth).</strong> Tempat seluruh anggota tim menarik update (pull) dan menyatukan kode (PR/merge).</td>
      </tr>
      <tr>
        <td><strong>finalmerge</strong></td>
        <td><span class="status-badge badge-retained">🔒 RETAINED</span></td>
        <td>Branch arsip integrasi. Telah disinkronkan 100% dengan Getra_Deploy. Tidak digunakan sebagai branch harian.</td>
      </tr>
      <tr>
        <td><strong>core-prd-sprint</strong></td>
        <td><span class="status-badge badge-retained">🔒 RETAINED</span></td>
        <td>Baseline fitur inti PRD. Telah disinkronkan 100% dengan Getra_Deploy.</td>
      </tr>
      <tr>
        <td><strong>UMKM</strong></td>
        <td><span class="status-badge badge-specialist">📦 SPECIALIST</span></td>
        <td>Arsip referensi modul UMKM lama. Jangan diubah langsung atau dijadikan base branch baru.</td>
      </tr>
      <tr>
        <td><strong>AIgetra</strong></td>
        <td><span class="status-badge badge-specialist">🧪 SPECIALIST</span></td>
        <td>Lab eksperimen AI & place resolver. Fitur yang sudah matang akan di-port ke Getra_Deploy.</td>
      </tr>
    </tbody>
  </table>

  <h2>🔄 2. Cara Mengambil Update Terbaru (Pull Project)</h2>
  <p>Setiap pagi sebelum mulai coding atau saat ingin menyinkronkan pekerjaan dengan tim:</p>
  <pre><code># 1. Ambil seluruh referensi terbaru dari GitHub
git fetch origin

# 2. Pindah ke branch utama
git checkout Getra_Deploy

# 3. Tarik update terbaru secara aman (fast-forward only)
git pull --ff-only origin Getra_Deploy</code></pre>

  <h2>✨ 3. Cara Mengerjakan Fitur Baru / Perbaikan Bug</h2>
  <div class="step-card">
    <span class="step-num">1</span> <span class="step-title">Buat Branch Baru dari Getra_Deploy</span>
    <p style="margin: 4px 0 6px; font-size: 8.8pt; color: #475569;">Gunakan format penamaan standar: <code>feat/&lt;nama-fitur&gt;</code> atau <code>fix/&lt;nama-bug&gt;</code>.</p>
    <pre style="margin-bottom: 0;"><code>git checkout Getra_Deploy
git checkout -b feat/tambah-filter-kategori</code></pre>
  </div>

  <div class="step-card">
    <span class="step-num">2</span> <span class="step-title">Coding & Simpan Commit</span>
    <pre style="margin-bottom: 0;"><code>git add &lt;file-yang-diubah&gt;
git commit -m "feat(umkm): tambah filter kategori kuliner pada pencarian"</code></pre>
  </div>

  <div class="step-card">
    <span class="step-num">3</span> <span class="step-title">Wajib Jalankan Quality Gate Lokal (Testing)</span>
    <p style="margin: 4px 0 6px; font-size: 8.8pt; color: #475569;">Sebelum push, pastikan tipe data, linting, dan test 100% PASS:</p>
    <pre style="margin-bottom: 0;"><code>cd frontend && npm run typecheck && npm run lint && npm test
cd ../backend && npm run typecheck && npm run lint && npm test</code></pre>
  </div>

  <div class="step-card">
    <span class="step-num">4</span> <span class="step-title">Push ke GitHub & Buat Pull Request (PR)</span>
    <pre style="margin-bottom: 0;"><code>git push -u origin feat/tambah-filter-kategori</code></pre>
    <p style="margin: 6px 0 0; font-size: 8.8pt; color: #0284c7;">
      Buka GitHub &rarr; Buat Pull Request dengan <strong>Base Branch: <code>Getra_Deploy</code></strong>. Setelah di-review dan disetujui, kode akan otomatis tergabung ke sistem utama.
    </p>
  </div>

  <div style="page-break-before: always;"></div>

  <h2>❌ 4. Aturan Keselamatan yang Diharamkan (Safety Rules)</h2>
  <div class="warning-box">
    <h3>Perintah Terlarang di Repositori GETRA:</h3>
    <ul>
      <li><strong>DILARANG <code>git push --force</code> atau <code>--force-with-lease</code></strong> ke branch <code>Getra_Deploy</code>.</li>
      <li><strong>DILARANG <code>git reset --hard</code></strong> pada commit publik bersama.</li>
      <li><strong>DILARANG membuat branch baru dari branch selain <code>Getra_Deploy</code>.</strong></li>
      <li><strong>DILARANG menghapus branch</strong> tanpa verifikasi bahwa seluruh commit telah terintegrasi.</li>
      <li><strong>DILARANG blind merge</strong> (merge mentah tanpa memeriksa potensi bug/regresi GIS).</li>
    </ul>
  </div>

  <h2>🎯 5. Quick Cheatsheet (Ringkasan Cepat)</h2>
  <div class="cheatsheet-grid">
    <div class="cheat-box">
      <div class="cheat-title">📥 1. Update Kode Tim</div>
      <pre><code>git checkout Getra_Deploy
git pull --ff-only origin Getra_Deploy</code></pre>
    </div>
    <div class="cheat-box">
      <div class="cheat-title">🌿 2. Buat Branch Fitur</div>
      <pre><code>git checkout -b feat/nama-fitur Getra_Deploy</code></pre>
    </div>
    <div class="cheat-box">
      <div class="cheat-title">🧪 3. Tes Kode Lokal</div>
      <pre><code>cd frontend && npm test
cd ../backend && npm test</code></pre>
    </div>
    <div class="cheat-box">
      <div class="cheat-title">🚀 4. Push & PR</div>
      <pre><code>git push -u origin feat/nama-fitur
# Lalu buat PR ke Getra_Deploy di GitHub!</code></pre>
    </div>
  </div>

  <div class="rule-box" style="margin-top: 20px;">
    <h3>📞 Butuh Bantuan / Terjadi Konflik?</h3>
    <p>
      Jika Anda menemukan merge conflict atau ragu dengan branch yang sedang dikerjakan, jangan segan untuk langsung berdiskusi dengan <strong>Christo (Repo Owner)</strong>. Jangan memaksakan perintah git yang berisiko menghapus kode.
    </p>
  </div>

  <div class="footer-note">
    Dokumen Resmi Repositori GETRA &bull; Production Governance Baseline &bull; Lokasi: <code>D:\\getra docs\\Production docs\\GETRA_PANDUAN_GIT_WORKFLOW_TIM.pdf</code>
  </div>

</body>
</html>`;

async function main() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"
  });

  try {
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: "networkidle" });
    await page.pdf({
      path: outputPath,
      format: "A4",
      printBackground: true,
      margin: {
        top: "14mm",
        right: "14mm",
        bottom: "16mm",
        left: "14mm"
      }
    });
    console.log("PDF GENERATED SUCCESSFULLY:", outputPath);
    const stats = fs.statSync(outputPath);
    console.log("PDF FILE SIZE:", stats.size, "bytes");
  } finally {
    await browser.close();
  }
}

main().catch(err => {
  console.error("ERROR GENERATING PDF:", err);
  process.exit(1);
});
