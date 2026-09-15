import puppeteer from "puppeteer-core";
import fs from "fs";
import path from "path";

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const DOCS_DIR = "D:\\getra docs\\Production docs\\final";
const MD_PATH = path.join(DOCS_DIR, "GETRA_SECURITY_QA_REPORT.md");
const PDF_PATH = path.join(DOCS_DIR, "GETRA_SECURITY_QA_REPORT.pdf");

async function generatePdf() {
  console.log("=== Generating Security QA Audit Report PDF ===");
  console.log("Input Markdown:", MD_PATH);
  console.log("Output PDF:", PDF_PATH);

  if (!fs.existsSync(MD_PATH)) {
    throw new Error(`Markdown file not found: ${MD_PATH}`);
  }

  const md = fs.readFileSync(MD_PATH, "utf8");

  // Basic markdown to HTML converter for professional PDF rendering
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
        htmlBody += `<table>\n<thead><tr>${cells.map(c => `<th>${c}</th>`).join("")}</tr></thead>\n<tbody>\n`;
      } else {
        htmlBody += `<tr>${cells.map(c => {
          let cellHtml = c
            .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
            .replace(/`(.*?)`/g, "<code>$1</code>");
          if (c === "PASS" || c === "FIXED" || c === "TRUE PASS") {
            cellHtml = `<span class="badge badge-pass">${c}</span>`;
          } else if (c === "P0" || c === "P1") {
            cellHtml = `<span class="badge badge-fail">${c}</span>`;
          } else if (c === "P2") {
            cellHtml = `<span class="badge badge-warn">${c}</span>`;
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
        .replace(/`(.*?)`/g, "<code>$1</code>");
      htmlBody += `<li>${itemText}</li>\n`;
      continue;
    } else if (inList) {
      inList = false;
      htmlBody += "</ul>\n";
    }

    // Headers
    if (line.startsWith("# ")) {
      htmlBody += `<h1>${line.slice(2)}</h1>\n`;
      continue;
    }
    if (line.startsWith("## ")) {
      htmlBody += `<h2>${line.slice(3)}</h2>\n`;
      continue;
    }
    if (line.startsWith("### ")) {
      htmlBody += `<h3>${line.slice(4)}</h3>\n`;
      continue;
    }

    // Blockquotes / Alerts
    if (line.startsWith("> ")) {
      const alertText = line.replace(/^> \s*/, "")
        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
        .replace(/`(.*?)`/g, "<code>$1</code>");
      htmlBody += `<div class="alert">${alertText}</div>\n`;
      continue;
    }

    if (line.trim() === "---") {
      htmlBody += "<hr />\n";
      continue;
    }

    if (line.trim().length > 0) {
      const pText = line
        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
        .replace(/`(.*?)`/g, "<code>$1</code>")
        .replace(/\*(.*?)\*/g, "<em>$1</em>");
      htmlBody += `<p>${pText}</p>\n`;
    }
  }

  if (inTable) htmlBody += "</tbody></table>\n";
  if (inList) htmlBody += "</ul>\n";

  const fullHtml = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>GETRA ISO/IEC 27001:2022-Aligned Security QA Report</title>
  <style>
    @page {
      size: A4;
      margin: 20mm 15mm 20mm 15mm;
      @bottom-right {
        content: "Page " counter(page);
        font-size: 9pt;
        color: #667085;
      }
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 10pt;
      line-height: 1.55;
      color: #1d2939;
      background: #ffffff;
      margin: 0;
      padding: 0;
    }
    h1 {
      font-size: 20pt;
      font-weight: 800;
      color: #0f172a;
      margin-top: 0;
      margin-bottom: 6px;
      border-bottom: 2px solid #0284c7;
      padding-bottom: 8px;
    }
    h2 {
      font-size: 14pt;
      font-weight: 700;
      color: #0369a1;
      margin-top: 18pt;
      margin-bottom: 8pt;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 4pt;
      page-break-after: avoid;
    }
    h3 {
      font-size: 11pt;
      font-weight: 700;
      color: #0f172a;
      margin-top: 12pt;
      margin-bottom: 4pt;
      page-break-after: avoid;
    }
    p {
      margin: 0 0 8pt 0;
    }
    ul {
      margin: 0 0 10pt 16pt;
      padding: 0;
    }
    li {
      margin-bottom: 4pt;
    }
    code {
      font-family: "JetBrains Mono", "SF Mono", Consolas, Menlo, monospace;
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
      padding: 10pt;
      border-radius: 6pt;
      overflow-x: auto;
      font-size: 8.5pt;
      margin-bottom: 12pt;
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
      margin: 10pt 0 14pt 0;
      font-size: 8.5pt;
      page-break-inside: avoid;
    }
    th, td {
      border: 1px solid #cbd5e1;
      padding: 6pt 8pt;
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
      padding: 2px 6px;
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
    .badge-fail {
      background: #fef2f2;
      color: #991b1b;
      border: 1px solid #fecaca;
    }
    .badge-warn {
      background: #fffbeb;
      color: #92400e;
      border: 1px solid #fde68a;
    }
    .alert {
      background: #f0f9ff;
      border-left: 4px solid #0284c7;
      padding: 8pt 12pt;
      border-radius: 4px;
      margin-bottom: 10pt;
      font-size: 9pt;
      color: #0c4a6e;
    }
    hr {
      border: 0;
      border-top: 1px solid #e2e8f0;
      margin: 14pt 0;
    }
  </style>
</head>
<body>
  ${htmlBody}
</body>
</html>`;

  console.log("Launching headless browser...");
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();
  await page.setContent(fullHtml, { waitUntil: "networkidle0" });

  console.log("Writing PDF file to:", PDF_PATH);
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
    headerTemplate: `<div style="font-size:8pt;color:#64748b;width:100%;text-align:right;padding-right:15mm;font-family:sans-serif;">GETRA — ISO/IEC 27001:2022-Aligned Security Baseline</div>`,
    footerTemplate: `<div style="font-size:8pt;color:#64748b;width:100%;text-align:center;font-family:sans-serif;">Confidential Security QA Audit • Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>`,
  });

  await browser.close();
  console.log("✅ PDF Generated successfully:", PDF_PATH);
}

generatePdf().catch(err => {
  console.error("PDF generation error:", err);
  process.exit(1);
});
