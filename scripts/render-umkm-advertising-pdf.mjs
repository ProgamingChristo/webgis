import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { marked } from "marked";
import puppeteer from "puppeteer-core";

const __filename = fileURLToPath(import.meta.url);
const rootDir = path.resolve(path.dirname(__filename), "..");
const sourcePath = path.join(rootDir, "docs", "final", "full_documentation.md");
const outputPath = path.join(rootDir, "docs", "final", "GETRA_UMKM_ADVERTISING_FULL_DOCUMENTATION.pdf");
const chromePath =
  process.env.CHROME_PATH ||
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

const markdown = await fs.readFile(sourcePath, "utf8");
const body = marked.parse(markdown, {
  gfm: true,
  breaks: false,
});

const html = `<!doctype html>
<html lang="id">
<head>
  <meta charset="utf-8" />
  <title>GETRA UMKM Advertising — Full Documentation</title>
  <style>
    @page {
      size: A4;
      margin: 18mm 16mm 20mm;
    }

    * {
      box-sizing: border-box;
    }

    body {
      color: #15202b;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 10pt;
      line-height: 1.45;
      margin: 0;
    }

    h1, h2, h3, h4 {
      color: #062536;
      line-height: 1.2;
      margin: 0 0 8px;
      page-break-after: avoid;
    }

    h1 {
      border-bottom: 3px solid #00a8d6;
      font-size: 22pt;
      padding-bottom: 8px;
      margin-top: 10px;
    }

    h2 {
      border-bottom: 1px solid #d8e5ec;
      font-size: 15pt;
      margin-top: 18px;
      padding-bottom: 4px;
    }

    h3 {
      font-size: 11.5pt;
      margin-top: 14px;
      color: #007a9e;
    }

    p {
      margin: 0 0 8px;
      text-align: justify;
    }

    ul, ol {
      margin: 0 0 10px 20px;
      padding: 0;
    }

    li {
      margin: 2px 0;
    }

    hr {
      border: 0;
      border-top: 1px solid #c9d9e2;
      margin: 14px 0;
    }

    code {
      background: #eef5f8;
      border: 1px solid #d2e2eb;
      border-radius: 4px;
      color: #094765;
      font-family: Consolas, "Courier New", monospace;
      font-size: 9pt;
      padding: 1px 4px;
    }

    pre {
      background: #0f1d28;
      border-radius: 6px;
      color: #e6f1f8;
      font-family: Consolas, "Courier New", monospace;
      font-size: 8.5pt;
      line-height: 1.35;
      margin: 8px 0 12px;
      overflow-x: auto;
      padding: 10px 12px;
      page-break-inside: avoid;
    }

    pre code {
      background: transparent;
      border: 0;
      color: inherit;
      padding: 0;
    }
  </style>
</head>
<body>
  ${body}
</body>
</html>`;

const browser = await puppeteer.launch({
  executablePath: chromePath,
  headless: true,
  args: ["--no-sandbox", "--disable-setuid-sandbox"],
});

try {
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "networkidle0" });
  await page.pdf({
    path: outputPath,
    format: "A4",
    printBackground: true,
    margin: {
      top: "18mm",
      right: "16mm",
      bottom: "20mm",
      left: "16mm",
    },
    displayHeaderFooter: true,
    headerTemplate: `
      <div style="font-family: Arial, sans-serif; font-size: 8pt; color: #6b8290; width: 100%; padding: 0 16mm; display: flex; justify-content: space-between;">
        <span>GETRA UMKM Intelligence & Advertising</span>
        <span>Phase 14 Final Release</span>
      </div>
    `,
    footerTemplate: `
      <div style="font-family: Arial, sans-serif; font-size: 8pt; color: #6b8290; width: 100%; padding: 0 16mm; display: flex; justify-content: space-between;">
        <span>CONFIDENTIAL & PROPRIETARY</span>
        <span>Halaman <span class="pageNumber"></span> dari <span class="totalPages"></span></span>
      </div>
    `,
  });
  console.log(`[PDF] Generated successfully at: ${outputPath}`);
} finally {
  await browser.close();
}
