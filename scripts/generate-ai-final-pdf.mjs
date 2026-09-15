import puppeteer from "puppeteer-core";
import fs from "fs";
import path from "path";

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const TARGET_DIR = "D:\\getra docs\\Production docs\\final\\AI FINAL";
const MD_PATH = path.join(TARGET_DIR, "GETRA_ACCESSIBILITY_AI_INTELLIGENCE_AND_SECURITY_DOCUMENTATION.md");
const PDF_PATH = path.join(TARGET_DIR, "GETRA_ACCESSIBILITY_AI_INTELLIGENCE_AND_SECURITY_DOCUMENTATION.pdf");

async function generatePdf() {
  console.log("=== Generating Final AI & Accessibility Documentation PDF ===");
  console.log("Input Markdown:", MD_PATH);
  console.log("Output PDF:", PDF_PATH);

  if (!fs.existsSync(MD_PATH)) {
    throw new Error(`Markdown file not found: ${MD_PATH}`);
  }

  const md = fs.readFileSync(MD_PATH, "utf8");

  // Markdown parser
  let htmlBody = "";
  const lines = md.split("\n");
  let inTable = false;
  let inCode = false;
  let codeBuffer = [];
  let inList = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.trim().startsWith("```")) {
      if (inCode) {
        htmlBody += `<pre><code>${codeBuffer.join("\n").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</code></pre>\n`;
        codeBuffer = [];
        inCode = false;
      } else {
        inCode = true;
      }
      continue;
    }

    if (inCode) {
      codeBuffer.push(line);
      continue;
    }

    // Tables
    if (line.trim().startsWith("|")) {
      const cells = line.split("|").slice(1, -1).map(c => c.trim());
      if (line.includes("---")) {
        continue;
      }
      if (!inTable) {
        inTable = true;
        htmlBody += `<table>\n<thead><tr>${cells.map(c => `<th>${c.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")}</th>`).join("")}</tr></thead>\n<tbody>\n`;
      } else {
        htmlBody += `<tr>${cells.map(c => {
          let cellHtml = c
            .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
            .replace(/\*(.*?)\*/g, "<em>$1</em>")
            .replace(/`(.*?)`/g, "<code>$1</code>");
          if (c.includes("PASS") || c.includes("VERIFIED") || c.includes("100%")) {
            cellHtml = `<span class="badge badge-pass">${cellHtml}</span>`;
          } else if (c.includes("NOL (false)")) {
            cellHtml = `<span class="badge badge-pass">0px OVERFLOW</span>`;
          }
          return `<td>${cellHtml}</td>`;
        }).join("")}</tr>\n`;
      }
      continue;
    } else if (inTable) {
      inTable = false;
      htmlBody += "</tbody></table>\n";
    }

    // Lists
    if (line.trim().startsWith("- ") || line.trim().startsWith("* ")) {
      if (!inList) {
        inList = true;
        htmlBody += "<ul>\n";
      }
      const itemText = line.trim().slice(2)
        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
        .replace(/\*(.*?)\*/g, "<em>$1</em>")
        .replace(/`(.*?)`/g, "<code>$1</code>");
      htmlBody += `<li>${itemText}</li>\n`;
      continue;
    } else if (inList && !line.trim().startsWith("1. ") && !line.trim().startsWith("2. ") && !line.trim().startsWith("3. ")) {
      inList = false;
      htmlBody += "</ul>\n";
    }

    // Numbered Lists
    const numMatch = line.trim().match(/^(\d+)\.\s+(.*)/);
    if (numMatch) {
      const itemText = numMatch[2]
        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
        .replace(/\*(.*?)\*/g, "<em>$1</em>")
        .replace(/`(.*?)`/g, "<code>$1</code>");
      htmlBody += `<div class="num-item"><span class="num-bullet">${numMatch[1]}.</span><div class="num-content">${itemText}</div></div>\n`;
      continue;
    }

    // Headers
    if (line.startsWith("# ")) {
      htmlBody += `<h1 class="main-title">${line.slice(2)}</h1>\n`;
      continue;
    }
    if (line.startsWith("## ")) {
      htmlBody += `<h2 class="sub-title">${line.slice(3)}</h2>\n`;
      continue;
    }
    if (line.startsWith("### ")) {
      htmlBody += `<h3 class="section-title">${line.slice(4)}</h3>\n`;
      continue;
    }
    if (line.startsWith("#### ")) {
      htmlBody += `<h4 class="subsection-title">${line.slice(5)}</h4>\n`;
      continue;
    }

    if (line.trim() === "---") {
      htmlBody += "<hr />\n";
      continue;
    }

    if (line.trim().length > 0) {
      const pText = line
        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
        .replace(/\*(.*?)\*/g, "<em>$1</em>")
        .replace(/`(.*?)`/g, "<code>$1</code>");
      htmlBody += `<p>${pText}</p>\n`;
    }
  }

  if (inTable) htmlBody += "</tbody></table>\n";
  if (inList) htmlBody += "</ul>\n";

  const fullHtml = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <title>GETRA — Accessibility, AI Intelligence & Security Documentation</title>
  <style>
    @page {
      size: A4;
      margin: 20mm 15mm 20mm 15mm;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 9.5pt;
      line-height: 1.55;
      color: #0f172a;
      background: #ffffff;
      margin: 0;
      padding: 0;
    }
    .main-title {
      font-size: 16pt;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.02em;
      margin: 0 0 4pt 0;
      border-bottom: 2px solid #2563eb;
      padding-bottom: 6pt;
    }
    .sub-title {
      font-size: 12pt;
      font-weight: 700;
      color: #2563eb;
      margin: 0 0 14pt 0;
    }
    .section-title {
      font-size: 11.5pt;
      font-weight: 700;
      color: #1e293b;
      margin: 16pt 0 8pt 0;
      padding-bottom: 3pt;
      border-bottom: 1px solid #e2e8f0;
      page-break-after: avoid;
    }
    .subsection-title {
      font-size: 10pt;
      font-weight: 700;
      color: #334155;
      margin: 12pt 0 6pt 0;
      page-break-after: avoid;
    }
    p {
      margin: 0 0 8pt 0;
      text-align: justify;
    }
    ul {
      margin: 0 0 10pt 0;
      padding-left: 18pt;
    }
    li {
      margin-bottom: 4pt;
    }
    .num-item {
      display: flex;
      gap: 6pt;
      margin-bottom: 6pt;
    }
    .num-bullet {
      font-weight: 700;
      color: #2563eb;
      min-width: 14pt;
    }
    .num-content {
      flex: 1;
    }
    code {
      font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
      font-size: 8.5pt;
      background: #f1f5f9;
      color: #0f172a;
      padding: 1px 4px;
      border-radius: 4px;
      border: 1px solid #e2e8f0;
    }
    pre {
      background: #0f172a;
      color: #f8fafc;
      padding: 8pt 10pt;
      border-radius: 6pt;
      overflow-x: auto;
      font-size: 8.5pt;
      margin-bottom: 10pt;
    }
    pre code {
      background: transparent;
      color: inherit;
      padding: 0;
      border: 0;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 8pt 0 12pt 0;
      font-size: 8.5pt;
      page-break-inside: avoid;
    }
    th, td {
      border: 1px solid #cbd5e1;
      padding: 5pt 7pt;
      text-align: left;
    }
    th {
      background: #f8fafc;
      font-weight: 700;
      color: #0f172a;
    }
    tr:nth-child(even) td {
      background: #fcfdfe;
    }
    .badge {
      display: inline-block;
      padding: 1.5px 5px;
      border-radius: 4px;
      font-size: 7.5pt;
      font-weight: 700;
      text-transform: uppercase;
    }
    .badge-pass {
      background: #ecfdf5;
      color: #065f46;
      border: 1px solid #a7f3d0;
    }
    hr {
      border: 0;
      border-top: 1px solid #e2e8f0;
      margin: 12pt 0;
    }
  </style>
</head>
<body>
  ${htmlBody}
</body>
</html>`;

  console.log("Launching headless Chrome...");
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();
  await page.setContent(fullHtml, { waitUntil: "networkidle0" });

  console.log("Rendering PDF to:", PDF_PATH);
  await page.pdf({
    path: PDF_PATH,
    format: "A4",
    printBackground: true,
    margin: {
      top: "20mm",
      bottom: "20mm",
      left: "15mm",
      right: "15mm",
    },
    displayHeaderFooter: true,
    headerTemplate: `<div style="font-size:8pt;color:#64748b;width:100%;text-align:right;padding-right:15mm;font-family:sans-serif;">GETRA — Accessibility, AI Intelligence & ISO 27001 Security Final Report</div>`,
    footerTemplate: `<div style="font-size:8pt;color:#64748b;width:100%;text-align:center;font-family:sans-serif;">MAPID WebGIS Competition 2026 • Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>`,
  });

  await browser.close();
  console.log("✅ PDF Generated successfully:", PDF_PATH);
}

generatePdf().catch(err => {
  console.error("PDF generation error:", err);
  process.exit(1);
});
