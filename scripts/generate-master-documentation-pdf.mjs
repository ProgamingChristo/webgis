import puppeteer from "puppeteer-core";
import fs from "fs";
import path from "path";

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const DOCS_DIR = "D:\\getra docs\\Production docs\\final";
const MD_PATH = path.join(DOCS_DIR, "Final_Documentation Getra.md");
const PDF_PATH = path.join(DOCS_DIR, "Final_Documentation Getra.pdf");
const IMAGES_DIR = path.join(DOCS_DIR, "images");

async function buildPdf() {
  console.log("=== Building Master PDF Documentation for GETRA ===");
  console.log("Source Markdown:", MD_PATH);
  console.log("Output PDF:", PDF_PATH);

  if (!fs.existsSync(MD_PATH)) {
    throw new Error(`Markdown file not found at: ${MD_PATH}`);
  }

  const mdContent = fs.readFileSync(MD_PATH, "utf8");

  // Read all images and map them to base64
  const imageMap = {};
  if (fs.existsSync(IMAGES_DIR)) {
    const files = fs.readdirSync(IMAGES_DIR);
    for (const file of files) {
      if (file.toLowerCase().endsWith(".png") || file.toLowerCase().endsWith(".jpg")) {
        const fullPath = path.join(IMAGES_DIR, file);
        const ext = file.toLowerCase().endsWith(".png") ? "png" : "jpeg";
        const b64 = fs.readFileSync(fullPath).toString("base64");
        imageMap[`images/${file}`] = `data:image/${ext};base64,${b64}`;
        imageMap[file] = `data:image/${ext};base64,${b64}`;
      }
    }
  }
  console.log(`Loaded ${Object.keys(imageMap).length / 2} images for base64 inlining.`);

  // Parse Markdown into structured HTML
  // Split into lines to parse tables, headers, alerts, code blocks cleanly
  const lines = mdContent.split("\n");
  let htmlOutput = "";
  let inCodeBlock = false;
  let codeBlockLang = "";
  let codeBuffer = [];
  let inTable = false;
  let tableHeader = true;
  let inList = false;
  let listType = "ul";

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // Handle Code Blocks
    if (line.trim().startsWith("```")) {
      if (inCodeBlock) {
        htmlOutput += `<pre class="code-block"><code>${codeBuffer.join("\n").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</code></pre>\n`;
        codeBuffer = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
        codeBlockLang = line.trim().slice(3).trim();
      }
      continue;
    }
    if (inCodeBlock) {
      codeBuffer.push(line);
      continue;
    }

    // Handle Tables
    if (line.trim().startsWith("|") && line.trim().endsWith("|")) {
      if (!inTable) {
        inTable = true;
        tableHeader = true;
        htmlOutput += `<table class="styled-table">\n`;
      }
      const cells = line.split("|").slice(1, -1).map(c => c.trim());
      // Check if delimiter row
      if (cells.every(c => /^:?-+:?$/.test(c))) {
        tableHeader = false;
        continue;
      }
      const tag = tableHeader ? "th" : "td";
      htmlOutput += `  <tr>\n` + cells.map(c => `    <${tag}>${parseInline(c, imageMap)}</${tag}>`).join("\n") + `\n  </tr>\n`;
      continue;
    } else if (inTable) {
      inTable = false;
      htmlOutput += `</table>\n`;
    }

    // Handle Lists
    if (/^(\s*)[-*]\s+(.*)$/.test(line)) {
      const match = line.match(/^(\s*)[-*]\s+(.*)$/);
      if (!inList || listType !== "ul") {
        if (inList) htmlOutput += `</${listType}>\n`;
        inList = true;
        listType = "ul";
        htmlOutput += `<ul>\n`;
      }
      htmlOutput += `  <li>${parseInline(match[2], imageMap)}</li>\n`;
      continue;
    } else if (/^(\s*)\d+\.\s+(.*)$/.test(line)) {
      const match = line.match(/^(\s*)\d+\.\s+(.*)$/);
      if (!inList || listType !== "ol") {
        if (inList) htmlOutput += `</${listType}>\n`;
        inList = true;
        listType = "ol";
        htmlOutput += `<ol>\n`;
      }
      htmlOutput += `  <li>${parseInline(match[2], imageMap)}</li>\n`;
      continue;
    } else if (inList) {
      inList = false;
      htmlOutput += `</${listType}>\n`;
    }

    // Handle Headings
    if (line.startsWith("# ")) {
      const text = line.slice(2).trim();
      htmlOutput += `<h1 class="h1-title">${parseInline(text, imageMap)}</h1>\n`;
      continue;
    }
    if (line.startsWith("## ")) {
      const text = line.slice(3).trim();
      htmlOutput += `<h2 class="h2-title">${parseInline(text, imageMap)}</h2>\n`;
      continue;
    }
    if (line.startsWith("### ")) {
      const text = line.slice(4).trim();
      htmlOutput += `<h3 class="h3-title">${parseInline(text, imageMap)}</h3>\n`;
      continue;
    }
    if (line.startsWith("#### ")) {
      const text = line.slice(5).trim();
      htmlOutput += `<h4 class="h4-title">${parseInline(text, imageMap)}</h4>\n`;
      continue;
    }

    // Handle Horizontal Rules
    if (/^---|\*\*\*|___$/.test(line.trim())) {
      htmlOutput += `<hr class="section-divider" />\n`;
      continue;
    }

    // Handle Callouts / Alerts
    if (line.startsWith("> [!NOTE]") || line.startsWith("> [!TIP]") || line.startsWith("> [!IMPORTANT]") || line.startsWith("> [!WARNING]")) {
      const type = line.match(/> \[!([A-Z]+)\]/)[1].toLowerCase();
      htmlOutput += `<div class="callout callout-${type}"><div class="callout-title">${type.toUpperCase()}</div>`;
      continue;
    }
    if (line.startsWith("> ")) {
      htmlOutput += `<p class="callout-text">${parseInline(line.slice(2).trim(), imageMap)}</p>`;
      // Check if next line is not quote
      if (i + 1 >= lines.length || !lines[i + 1].startsWith("> ")) {
        htmlOutput += `</div>\n`;
      }
      continue;
    }

    // Handle Images
    const imgMatch = line.trim().match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (imgMatch) {
      const alt = imgMatch[1];
      const src = imgMatch[2].trim();
      const base64Src = imageMap[src] || imageMap[path.basename(src)];
      if (base64Src) {
        htmlOutput += `<div class="figure-container"><img src="${base64Src}" alt="${alt}" class="figure-img" /></div>\n`;
      } else {
        htmlOutput += `<div class="figure-container"><p class="missing-img">[Gambar: ${alt}]</p></div>\n`;
      }
      continue;
    }

    // Handle Italic Figure Captions
    if (line.trim().startsWith("*Gambar ") && line.trim().endsWith("*")) {
      htmlOutput += `<p class="figure-caption">${parseInline(line.trim(), imageMap)}</p>\n`;
      continue;
    }

    // Standard Paragraph
    if (line.trim().length > 0) {
      htmlOutput += `<p class="body-text">${parseInline(line.trim(), imageMap)}</p>\n`;
    }
  }

  function parseInline(text, imgMap) {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  }

  const fullHtml = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>GETRA - Dokumentasi Teknis Master & Manual Book</title>
  <style>
    @page {
      size: A4;
      margin: 18mm 16mm 18mm 16mm;
      @bottom-right {
        content: counter(page);
      }
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #0f172a;
      line-height: 1.6;
      font-size: 10.5pt;
      background: #ffffff;
      margin: 0;
      padding: 0;
    }
    .header-tag {
      background: #0284c7;
      color: #ffffff;
      padding: 4px 12px;
      border-radius: 4px;
      font-size: 8.5pt;
      font-weight: 800;
      letter-spacing: 0.5px;
      display: inline-block;
      margin-bottom: 12px;
      text-transform: uppercase;
    }
    .h1-title {
      font-size: 22pt;
      font-weight: 900;
      color: #0f172a;
      border-bottom: 3px solid #0284c7;
      padding-bottom: 8px;
      margin-top: 28px;
      margin-bottom: 12px;
      page-break-after: avoid;
    }
    .h2-title {
      font-size: 15pt;
      font-weight: 800;
      color: #0369a1;
      border-bottom: 1.5px solid #e2e8f0;
      padding-bottom: 6px;
      margin-top: 24px;
      margin-bottom: 10px;
      page-break-after: avoid;
    }
    .h3-title {
      font-size: 12pt;
      font-weight: 700;
      color: #1e293b;
      margin-top: 18px;
      margin-bottom: 6px;
      page-break-after: avoid;
    }
    .h4-title {
      font-size: 10.5pt;
      font-weight: 700;
      color: #334155;
      margin-top: 14px;
      margin-bottom: 4px;
      page-break-after: avoid;
    }
    .body-text {
      margin: 6px 0;
      text-align: justify;
    }
    ul, ol {
      margin: 6px 0 10px 22px;
      padding-left: 0;
    }
    li {
      margin-bottom: 4px;
    }
    code {
      background: #f1f5f9;
      color: #0284c7;
      padding: 2px 5px;
      border-radius: 4px;
      font-size: 9pt;
      font-family: Consolas, "Courier New", monospace;
    }
    .code-block {
      background: #0f172a;
      color: #f8fafc;
      padding: 12px 16px;
      border-radius: 6px;
      font-size: 8.5pt;
      font-family: Consolas, "Courier New", monospace;
      margin: 12px 0;
      overflow-x: auto;
      page-break-inside: avoid;
      border: 1px solid #334155;
      line-height: 1.45;
    }
    .code-block code {
      background: transparent;
      color: #38bdf8;
      padding: 0;
    }
    .styled-table {
      width: 100%;
      border-collapse: collapse;
      margin: 14px 0;
      font-size: 9pt;
      page-break-inside: avoid;
    }
    .styled-table th, .styled-table td {
      border: 1px solid #cbd5e1;
      padding: 6px 10px;
      text-align: left;
    }
    .styled-table th {
      background: #f1f5f9;
      font-weight: 700;
      color: #0f172a;
    }
    .styled-table tr:nth-child(even) td {
      background: #f8fafc;
    }
    .section-divider {
      border: 0;
      height: 1px;
      background: #e2e8f0;
      margin: 20px 0;
    }
    .callout {
      margin: 14px 0;
      padding: 12px 16px;
      border-radius: 6px;
      border-left: 4px solid #0284c7;
      background: #f0f9ff;
      page-break-inside: avoid;
    }
    .callout-important {
      border-left-color: #e11d48;
      background: #fff1f2;
    }
    .callout-tip {
      border-left-color: #059669;
      background: #ecfdf5;
    }
    .callout-warning {
      border-left-color: #d97706;
      background: #fffbeb;
    }
    .callout-title {
      font-size: 8.5pt;
      font-weight: 800;
      color: #0f172a;
      margin-bottom: 4px;
      letter-spacing: 0.5px;
    }
    .callout-text {
      margin: 4px 0;
      color: #334155;
      font-size: 9.5pt;
    }
    .figure-container {
      margin: 14px 0 4px 0;
      text-align: center;
      page-break-inside: avoid;
    }
    .figure-img {
      max-width: 95%;
      max-height: 380px;
      border-radius: 6px;
      border: 1px solid #cbd5e1;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.08);
    }
    .figure-caption {
      text-align: center;
      font-size: 8.5pt;
      color: #64748b;
      font-style: italic;
      margin-top: 4px;
      margin-bottom: 14px;
      page-break-inside: avoid;
    }
    .doc-footer {
      margin-top: 36px;
      border-top: 1.5px solid #e2e8f0;
      padding-top: 10px;
      font-size: 8pt;
      color: #94a3b8;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="header-tag">GETRA OFFICIAL MASTER DOCUMENTATION · MAPID 2026</div>
  ${htmlOutput}
  <div class="doc-footer">
    Hak Cipta © 2026 GETRA — Geo-Enabled Transit & Retail Analytics · Tim Owalah, Universitas Pradita · All Rights Reserved
  </div>
</body>
</html>`;

  console.log("Launching Puppeteer browser...");
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: "new",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-gpu",
      "--disable-dev-shm-usage",
    ],
  });

  const page = await browser.newPage();
  page.setDefaultTimeout(180000);
  page.setDefaultNavigationTimeout(180000);

  console.log("Setting page content (HTML size: " + (fullHtml.length / 1024 / 1024).toFixed(2) + " MB)...");
  await page.setContent(fullHtml, { waitUntil: "domcontentloaded", timeout: 180000 });

  console.log("Waiting for all images to decode...");
  await page.evaluate(async () => {
    const selectors = Array.from(document.querySelectorAll("img"));
    await Promise.all(
      selectors.map((img) => {
        if (img.complete) return Promise.resolve();
        return new Promise((resolve) => {
          img.onload = img.onerror = resolve;
        });
      })
    );
  });

  console.log("Rendering PDF file to:", PDF_PATH);
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
    displayHeaderFooter: true,
    headerTemplate: `
      <div style="font-size: 7.5pt; color: #94a3b8; width: 100%; text-align: right; padding-right: 16mm;">
        GETRA — Geo-Enabled Transit & Retail Analytics | Final Documentation
      </div>
    `,
    footerTemplate: `
      <div style="font-size: 7.5pt; color: #94a3b8; width: 100%; display: flex; justify-content: space-between; padding-left: 16mm; padding-right: 16mm;">
        <span>Tim Owalah · Universitas Pradita · MAPID WebGIS 2026</span>
        <span>Halaman <span class="pageNumber"></span> dari <span class="totalPages"></span></span>
      </div>
    `,
  });

  await browser.close();

  const stats = fs.statSync(PDF_PATH);
  console.log(`=== Master PDF Successfully Generated! Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB ===`);
}

buildPdf().catch(err => {
  console.error("Failed to generate master PDF:", err);
  process.exit(1);
});
