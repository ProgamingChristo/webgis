import puppeteer from "puppeteer-core";
import fs from "fs";
import path from "path";

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const DOCS_DIR = "D:\\getra docs\\Production docs\\final";
const MD_PATH = path.join(DOCS_DIR, "GETRA_MANUAL_BOOK_DAN_DOKUMENTASI_FINAL.md");
const PDF_PATH = path.join(DOCS_DIR, "GETRA_MANUAL_BOOK_DAN_DOKUMENTASI_FINAL.pdf");
const IMAGES_DIR = path.join(DOCS_DIR, "images");

async function generatePdf() {
  console.log("=== Generating High-Quality PDF for Final Manual Book ===");
  
  let mdContent = fs.readFileSync(MD_PATH, "utf8");

  // Read images and convert to base64 so PDF renders perfectly without local file protocol issues
  const imageNames = fs.readdirSync(IMAGES_DIR);
  const imageMap = {};
  for (const img of imageNames) {
    if (img.endsWith(".png")) {
      const p = path.join(IMAGES_DIR, img);
      const b64 = fs.readFileSync(p).toString("base64");
      imageMap[`images/${img}`] = `data:image/png;base64,${b64}`;
      imageMap[img] = `data:image/png;base64,${b64}`;
    }
  }

  // Replace image markdown tags with base64 img tags
  // Format: ![Caption](images/01-payment-before.png)
  let htmlBody = mdContent
    .replace(/^# (.*$)/gim, '<h1 class="doc-title">$1</h1>')
    .replace(/^## (.*$)/gim, '<h2 class="section-title">$1</h2>')
    .replace(/^### (.*$)/gim, '<h3 class="subsection-title">$1</h3>')
    .replace(/^#### (.*$)/gim, '<h4 class="topic-title">$1</h4>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match, alt, src) => {
      const cleanSrc = src.trim();
      const b64 = imageMap[cleanSrc] || imageMap[path.basename(cleanSrc)];
      if (b64) {
        return `<div class="img-container"><img src="${b64}" alt="${alt}" /><p class="img-caption">${alt}</p></div>`;
      }
      return match;
    })
    .replace(/^\> (.*$)/gim, '<blockquote>$1</blockquote>')
    .replace(/\n\n/g, '<p></p>');

  const html = `
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="UTF-8">
      <title>GETRA - Buku Panduan & Dokumentasi Final</title>
      <style>
        @page {
          size: A4;
          margin: 18mm 16mm 18mm 16mm;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          color: #0f172a;
          line-height: 1.6;
          font-size: 11pt;
          background: #ffffff;
        }
        .header-badge {
          background: #0284c7;
          color: white;
          padding: 4px 12px;
          border-radius: 6px;
          font-size: 9pt;
          font-weight: 800;
          display: inline-block;
          margin-bottom: 12px;
          text-transform: uppercase;
        }
        .doc-title {
          font-size: 22pt;
          font-weight: 900;
          color: #0f172a;
          border-bottom: 3px solid #0284c7;
          padding-bottom: 8px;
          margin-top: 0;
          margin-bottom: 12px;
        }
        .section-title {
          font-size: 15pt;
          font-weight: 800;
          color: #0369a1;
          border-bottom: 1.5px solid #e2e8f0;
          padding-bottom: 6px;
          margin-top: 24px;
          margin-bottom: 10px;
          page-break-after: avoid;
        }
        .subsection-title {
          font-size: 12pt;
          font-weight: 700;
          color: #1e293b;
          margin-top: 16px;
          margin-bottom: 6px;
          page-break-after: avoid;
        }
        .topic-title {
          font-size: 11pt;
          font-weight: 700;
          color: #334155;
          margin-top: 12px;
          margin-bottom: 4px;
          page-break-after: avoid;
        }
        p {
          margin: 6px 0;
        }
        ul, ol {
          margin: 6px 0 12px 20px;
          padding-left: 0;
        }
        li {
          margin-bottom: 4px;
        }
        code {
          background: #f1f5f9;
          color: #0369a1;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 9.5pt;
          font-family: Consolas, monospace;
        }
        blockquote {
          border-left: 4px solid #0284c7;
          background: #f8fafc;
          margin: 12px 0;
          padding: 10px 16px;
          border-radius: 0 8px 8px 0;
          font-style: italic;
          color: #334155;
        }
        .img-container {
          margin: 14px 0;
          text-align: center;
          page-break-inside: avoid;
        }
        .img-container img {
          max-width: 96%;
          max-height: 380px;
          border-radius: 8px;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1);
          border: 1px solid #e2e8f0;
        }
        .img-caption {
          font-size: 8.5pt;
          color: #64748b;
          font-style: italic;
          margin-top: 4px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 12px 0;
          font-size: 9.5pt;
          page-break-inside: avoid;
        }
        th, td {
          border: 1px solid #cbd5e1;
          padding: 6px 10px;
          text-align: left;
        }
        th {
          background: #f1f5f9;
          font-weight: 700;
          color: #0f172a;
        }
        .footer {
          margin-top: 30px;
          border-top: 1px solid #e2e8f0;
          padding-top: 10px;
          font-size: 8.5pt;
          color: #94a3b8;
          text-align: center;
        }
      </style>
    </head>
    <body>
      <div class="header-badge">GETRA OFFICIAL RELEASE DOCUMENTATION</div>
      ${htmlBody}
      <div class="footer">
        © 2026 GETRA WebGIS Platform · All Rights Reserved · Lingkungan Produksi & Referensi Terverifikasi
      </div>
    </body>
    </html>
  `;

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "networkidle0" });
  await page.pdf({
    path: PDF_PATH,
    format: "A4",
    printBackground: true,
    margin: {
      top: "18mm",
      bottom: "18mm",
      left: "16mm",
      right: "16mm",
    },
  });

  await browser.close();
  console.log("=== PDF Generated Successfully at:", PDF_PATH);
}

generatePdf().catch(console.error);
