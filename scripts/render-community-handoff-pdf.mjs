import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { marked } from "marked";
import puppeteer from "puppeteer-core";

const __filename = fileURLToPath(import.meta.url);
const rootDir = path.resolve(path.dirname(__filename), "..");
const sourcePath = path.join(rootDir, "docs", "handoff_community.md");
const outputPath = path.join(rootDir, "docs", "handoff_community.pdf");
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
  <title>GETRA Community Handoff</title>
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
      font-size: 10.5pt;
      line-height: 1.48;
      margin: 0;
    }

    h1, h2, h3 {
      color: #062536;
      line-height: 1.2;
      margin: 0 0 8px;
      page-break-after: avoid;
    }

    h1 {
      border-bottom: 3px solid #00a8d6;
      font-size: 25pt;
      padding-bottom: 10px;
    }

    h2 {
      border-bottom: 1px solid #d8e5ec;
      font-size: 16pt;
      margin-top: 22px;
      padding-bottom: 5px;
    }

    h3 {
      font-size: 12.5pt;
      margin-top: 16px;
    }

    p {
      margin: 0 0 9px;
    }

    ul, ol {
      margin: 0 0 10px 20px;
      padding: 0;
    }

    li {
      margin: 2px 0;
    }

    table {
      border-collapse: collapse;
      margin: 10px 0 14px;
      page-break-inside: avoid;
      width: 100%;
    }

    th, td {
      border: 1px solid #c9d9e2;
      padding: 6px 7px;
      text-align: left;
      vertical-align: top;
    }

    th {
      background: #eaf6fa;
      color: #062536;
      font-weight: 700;
    }

    code {
      background: #eef5f7;
      border-radius: 4px;
      color: #0b4258;
      font-family: Consolas, "Courier New", monospace;
      font-size: 9pt;
      padding: 1px 4px;
    }

    pre {
      background: #071821;
      border-radius: 6px;
      color: #dff7ff;
      font-family: Consolas, "Courier New", monospace;
      font-size: 8.8pt;
      line-height: 1.38;
      margin: 9px 0 13px;
      overflow-wrap: anywhere;
      padding: 10px 12px;
      white-space: pre-wrap;
    }

    pre code {
      background: transparent;
      color: inherit;
      font-size: inherit;
      padding: 0;
    }

    blockquote {
      border-left: 4px solid #00a8d6;
      color: #3a5260;
      margin: 10px 0;
      padding: 4px 0 4px 12px;
    }

    a {
      color: #007ea7;
      text-decoration: none;
    }
  </style>
</head>
<body>${body}</body>
</html>`;

const browser = await puppeteer.launch({
  executablePath: chromePath,
  headless: "new",
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});

try {
  const page = await browser.newPage();
  await page.setContent(html, {
    waitUntil: "networkidle0",
  });
  await page.pdf({
    path: outputPath,
    format: "A4",
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: `<div style="font-family: Arial, sans-serif; font-size: 8px; color: #5d7280; width: 100%; padding: 0 16mm;">GETRA Community Handoff</div>`,
    footerTemplate: `<div style="font-family: Arial, sans-serif; font-size: 8px; color: #5d7280; width: 100%; padding: 0 16mm; text-align: right;"><span class="pageNumber"></span> / <span class="totalPages"></span></div>`,
    margin: {
      top: "18mm",
      right: "16mm",
      bottom: "20mm",
      left: "16mm",
    },
  });
} finally {
  await browser.close();
}

console.log(outputPath);
