import puppeteer from "puppeteer-core";
import fs from "fs";
import path from "path";

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const DOCS_DIR = "D:\\getra docs\\Production docs\\final";
const MD_PATH = path.join(DOCS_DIR, "Final_Documentation Getra.md");
const PREVIEW_DIR = path.resolve("outputs/final-documentation/previews");

if (!fs.existsSync(PREVIEW_DIR)) {
  fs.mkdirSync(PREVIEW_DIR, { recursive: true });
}

async function renderDocPreviews() {
  console.log("=== Generating Document Preview Images ===");

  const mdContent = fs.readFileSync(MD_PATH, "utf8");

  // Load images map
  const imageMap = {};
  const imageDirs = [
    path.join(DOCS_DIR, "Final_Documentation_Getra_assets"),
    path.join(DOCS_DIR, "images"),
  ];

  for (const dir of imageDirs) {
    if (fs.existsSync(dir)) {
      const dirName = path.basename(dir);
      const files = fs.readdirSync(dir);
      for (const file of files) {
        if (file.toLowerCase().endsWith(".png") || file.toLowerCase().endsWith(".jpg") || file.toLowerCase().endsWith(".jpeg")) {
          const fullPath = path.join(dir, file);
          const ext = file.toLowerCase().endsWith(".png") ? "png" : "jpeg";
          const b64 = fs.readFileSync(fullPath).toString("base64");
          imageMap[`${dirName}/${file}`] = `data:image/${ext};base64,${b64}`;
          imageMap[file] = `data:image/${ext};base64,${b64}`;
        }
      }
    }
  }

  // Parse Markdown to HTML
  const lines = mdContent.split("\n");
  let htmlOutput = "";
  let inCodeBlock = false;
  let codeBuffer = [];
  let inTable = false;
  let tableHeader = true;
  let inList = false;

  function parseInline(text) {
    return text
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  }

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    if (line.trim().startsWith("```")) {
      if (inCodeBlock) {
        htmlOutput += `<pre class="code-block"><code>${codeBuffer.join("\n").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</code></pre>\n`;
        codeBuffer = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      continue;
    }
    if (inCodeBlock) {
      codeBuffer.push(line);
      continue;
    }

    if (line.trim().startsWith("|") && line.trim().endsWith("|")) {
      if (!inTable) {
        inTable = true;
        tableHeader = true;
        htmlOutput += `<table class="styled-table">\n`;
      }
      const cells = line.split("|").slice(1, -1).map((c) => c.trim());
      if (cells.every((c) => /^:?-+:?$/.test(c))) {
        tableHeader = false;
        continue;
      }
      const tag = tableHeader ? "th" : "td";
      htmlOutput += `  <tr>\n` + cells.map((c) => `    <${tag}>${parseInline(c)}</${tag}>`).join("\n") + `\n  </tr>\n`;
      continue;
    } else if (inTable) {
      inTable = false;
      htmlOutput += `</table>\n`;
    }

    if (/^(\s*)[-*]\s+(.*)$/.test(line)) {
      const match = line.match(/^(\s*)[-*]\s+(.*)$/);
      if (!inList) {
        inList = true;
        htmlOutput += `<ul>\n`;
      }
      htmlOutput += `  <li>${parseInline(match[2])}</li>\n`;
      continue;
    } else if (inList) {
      inList = false;
      htmlOutput += `</ul>\n`;
    }

    if (line.startsWith("# ")) {
      htmlOutput += `<h1 class="h1-title">${parseInline(line.slice(2).trim())}</h1>\n`;
      continue;
    }
    if (line.startsWith("## ")) {
      htmlOutput += `<h2 class="h2-title">${parseInline(line.slice(3).trim())}</h2>\n`;
      continue;
    }
    if (line.startsWith("### ")) {
      htmlOutput += `<h3 class="h3-title">${parseInline(line.slice(4).trim())}</h3>\n`;
      continue;
    }
    if (line.startsWith("#### ")) {
      htmlOutput += `<h4 class="h4-title">${parseInline(line.slice(5).trim())}</h4>\n`;
      continue;
    }
    if (line.trim() === "---") {
      htmlOutput += `<hr class="divider" />\n`;
      continue;
    }

    if (line.startsWith("> ")) {
      htmlOutput += `<blockquote class="callout"><p>${parseInline(line.slice(2).trim())}</p></blockquote>\n`;
      continue;
    }

    const imgMatch = line.trim().match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (imgMatch) {
      const alt = imgMatch[1];
      const src = imgMatch[2].trim();
      const base64Src = imageMap[src] || imageMap[path.basename(src)];
      if (base64Src) {
        htmlOutput += `<div class="figure-container"><img src="${base64Src}" alt="${alt}" class="figure-img" /></div>\n`;
      }
      continue;
    }

    if (line.trim().startsWith("*Gambar ") && line.trim().endsWith("*")) {
      htmlOutput += `<p class="figure-caption">${parseInline(line.trim())}</p>\n`;
      continue;
    }

    if (line.trim().length > 0) {
      htmlOutput += `<p class="body-text">${parseInline(line.trim())}</p>\n`;
    }
  }

  const fullHtml = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>GETRA - Dokumentasi Master</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      color: #0f172a;
      line-height: 1.6;
      font-size: 11pt;
      background: #f8fafc;
      margin: 0;
      padding: 40px;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .doc-page {
      background: #ffffff;
      width: 800px;
      padding: 48px 56px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.08);
      border-radius: 8px;
      margin-bottom: 32px;
      box-sizing: border-box;
    }
    .h1-title {
      font-size: 20pt;
      font-weight: 900;
      color: #0f172a;
      border-bottom: 3px solid #0284c7;
      padding-bottom: 8px;
      margin-top: 24px;
      margin-bottom: 12px;
    }
    .h2-title {
      font-size: 14pt;
      font-weight: 800;
      color: #0369a1;
      border-bottom: 1.5px solid #e2e8f0;
      padding-bottom: 6px;
      margin-top: 20px;
      margin-bottom: 10px;
    }
    .h3-title {
      font-size: 11.5pt;
      font-weight: 700;
      color: #1e293b;
      margin-top: 14px;
      margin-bottom: 6px;
    }
    .body-text {
      margin-top: 0;
      margin-bottom: 10px;
      text-align: justify;
    }
    .styled-table {
      width: 100%;
      border-collapse: collapse;
      margin: 12px 0 16px 0;
      font-size: 9.5pt;
    }
    .styled-table th {
      background: #0284c7;
      color: #ffffff;
      font-weight: 700;
      text-align: left;
      padding: 8px 10px;
      border: 1px solid #0284c7;
    }
    .styled-table td {
      padding: 7px 10px;
      border: 1px solid #cbd5e1;
      vertical-align: top;
    }
    .styled-table tr:nth-child(even) td {
      background: #f8fafc;
    }
    .code-block {
      background: #0f172a;
      color: #38bdf8;
      padding: 12px 14px;
      border-radius: 6px;
      font-family: Consolas, monospace;
      font-size: 8.5pt;
      overflow-x: auto;
      margin: 10px 0;
    }
    .callout {
      border-left: 4px solid #0284c7;
      background: #f0f9ff;
      padding: 8px 14px;
      border-radius: 0 6px 6px 0;
      margin: 10px 0;
      color: #0369a1;
    }
    .figure-container {
      text-align: center;
      margin: 14px 0 6px 0;
    }
    .figure-img {
      max-width: 100%;
      max-height: 420px;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.06);
    }
    .figure-caption {
      font-size: 8.5pt;
      color: #64748b;
      text-align: center;
      margin-top: 4px;
      margin-bottom: 14px;
      font-style: italic;
    }
    .divider {
      border: 0;
      height: 1px;
      background: #e2e8f0;
      margin: 24px 0;
    }
  </style>
</head>
<body>
  <div class="doc-page">
    ${htmlOutput}
  </div>
</body>
</html>`;

  const previewHtmlPath = path.join(PREVIEW_DIR, "preview.html");
  fs.writeFileSync(previewHtmlPath, fullHtml, "utf8");

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 1600 });
  await page.goto(`file://${previewHtmlPath.replace(/\\/g, "/")}`, { waitUntil: "domcontentloaded", timeout: 180000 });
  await new Promise((r) => setTimeout(r, 2000));

  // Capture preview 1: Cover and Document Control
  console.log("Capturing Page 1: Cover and Document Control...");
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: path.join(PREVIEW_DIR, "01_cover_and_control.png"), clip: { x: 180, y: 30, width: 840, height: 1100 } });

  // Capture preview 2: Table of Contents & Executive Summary
  console.log("Capturing Page 2: Table of Contents & Executive Summary...");
  await page.evaluate(() => window.scrollTo(0, 950));
  await page.screenshot({ path: path.join(PREVIEW_DIR, "02_table_of_contents.png"), clip: { x: 180, y: 0, width: 840, height: 1100 } });

  // Capture preview 3: Architecture & System Diagram
  console.log("Capturing Section: Architecture & System Diagram...");
  const diagramY = await page.evaluate(() => {
    const el = document.querySelector('img[alt*="arsitektur"], img[alt*="Arsitektur"]');
    if (el) return el.getBoundingClientRect().top + window.scrollY - 100;
    return 3000;
  });
  await page.evaluate((y) => window.scrollTo(0, y), diagramY);
  await page.screenshot({ path: path.join(PREVIEW_DIR, "03_architecture_diagram.png"), clip: { x: 180, y: 0, width: 840, height: 1100 } });

  // Capture preview 4: Map & Discovery / Routing
  console.log("Capturing Section: Map & Routing...");
  const routingY = await page.evaluate(() => {
    const el = document.querySelector('img[alt*="routing"], img[alt*="Routing"]');
    if (el) return el.getBoundingClientRect().top + window.scrollY - 100;
    return 6000;
  });
  await page.evaluate((y) => window.scrollTo(0, y), routingY);
  await page.screenshot({ path: path.join(PREVIEW_DIR, "04_routing_active_journey.png"), clip: { x: 180, y: 0, width: 840, height: 1100 } });

  // Capture preview 5: Promotion & Payment Sandbox
  console.log("Capturing Section: Promotion & Payment Sandbox...");
  const promoY = await page.evaluate(() => {
    const el = document.querySelector('img[alt*="uji penayangan"], img[alt*="Promosi"]');
    if (el) return el.getBoundingClientRect().top + window.scrollY - 100;
    return 10000;
  });
  await page.evaluate((y) => window.scrollTo(0, y), promoY);
  await page.screenshot({ path: path.join(PREVIEW_DIR, "05_promotion_campaign_builder.png"), clip: { x: 180, y: 0, width: 840, height: 1100 } });

  await browser.close();
  console.log("=== Document Preview Images Successfully Generated! ===");
}

renderDocPreviews().catch((err) => {
  console.error("Failed to generate doc previews:", err);
  process.exit(1);
});
