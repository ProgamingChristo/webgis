import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const mdPath = path.resolve("docs/final/GETRA_BACKEND_COMPLETE_DOCUMENTATION.md");
const htmlPath = path.resolve("docs/final/document.html");
const pdfPath = path.resolve("docs/final/GETRA_BACKEND_COMPLETE_DOCUMENTATION.pdf");

const mdContent = fs.readFileSync(mdPath, "utf-8");

// Simple, robust markdown to HTML converter for technical manuals
function parseMarkdown(md) {
  const lines = md.split(/\r?\n/);
  let html = "";
  let inCodeBlock = false;
  let codeLang = "";
  let codeBuffer = [];
  let inTable = false;
  let tableBuffer = [];
  let inList = false;

  function flushList() {
    if (inList) {
      html += "</ul>\n";
      inList = false;
    }
  }

  function flushTable() {
    if (inTable) {
      if (tableBuffer.length > 0) {
        html += '<div class="table-container"><table>\n';
        // Check if second row is separator
        let headerDone = false;
        for (let i = 0; i < tableBuffer.length; i++) {
          const row = tableBuffer[i].trim();
          if (row.startsWith("|") && row.endsWith("|")) {
            const cells = row.slice(1, -1).split("|").map(c => c.trim());
            if (i === 1 && cells.every(c => /^:?-+:?$/.test(c))) {
              // separator row
              continue;
            }
            if (!headerDone) {
              html += "  <thead>\n    <tr>\n";
              cells.forEach(c => {
                html += `      <th>${inlineFormat(c)}</th>\n`;
              });
              html += "    </tr>\n  </thead>\n  <tbody>\n";
              headerDone = true;
            } else {
              html += "    <tr>\n";
              cells.forEach(c => {
                html += `      <td>${inlineFormat(c)}</td>\n`;
              });
              html += "    </tr>\n";
            }
          }
        }
        if (headerDone) html += "  </tbody>\n";
        html += "</table></div>\n";
      }
      inTable = false;
      tableBuffer = [];
    }
  }

  function inlineFormat(text) {
    let out = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    
    // Bold
    out = out.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
    // Italic
    out = out.replace(/\*(.*?)\*/g, "<em>$1</em>");
    // Inline code
    out = out.replace(/`([^`]+)`/g, "<code>$1</code>");
    // Links
    out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
    
    return out;
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Code block toggle
    if (line.startsWith("```")) {
      flushList();
      flushTable();
      if (!inCodeBlock) {
        inCodeBlock = true;
        codeLang = line.slice(3).trim();
        codeBuffer = [];
      } else {
        inCodeBlock = false;
        const escaped = codeBuffer.map(l => l.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")).join("\n");
        html += `<pre class="code-block ${codeLang}"><div class="code-header">${codeLang.toUpperCase() || 'CODE'}</div><code>${escaped}</code></pre>\n`;
        codeBuffer = [];
      }
      continue;
    }

    if (inCodeBlock) {
      codeBuffer.push(line);
      continue;
    }

    // Tables
    if (line.trim().startsWith("|") && line.trim().endsWith("|")) {
      flushList();
      inTable = true;
      tableBuffer.push(line);
      continue;
    } else {
      flushTable();
    }

    // Alert Blockquotes
    if (line.startsWith("> [!NOTE]") || line.startsWith("> [!TIP]") || line.startsWith("> [!IMPORTANT]") || line.startsWith("> [!WARNING]") || line.startsWith("> [!CAUTION]")) {
      flushList();
      const type = line.match(/> \[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]/)[1];
      let alertContent = [];
      while (i + 1 < lines.length && lines[i + 1].startsWith(">")) {
        i++;
        alertContent.push(lines[i].replace(/^>\s?/, ""));
      }
      html += `<div class="alert alert-${type.toLowerCase()}"><div class="alert-title">${type}</div><p>${inlineFormat(alertContent.join(" "))}</p></div>\n`;
      continue;
    }

    // Headers
    if (line.startsWith("# ")) {
      flushList();
      html += `<h1 class="doc-main-title">${inlineFormat(line.slice(2))}</h1>\n`;
      continue;
    }
    if (line.startsWith("## ")) {
      flushList();
      const title = line.slice(3);
      const isChapter = /^\d+\.\s/.test(title);
      html += `<h2 class="section-title ${isChapter ? 'chapter-break' : ''}">${inlineFormat(title)}</h2>\n`;
      continue;
    }
    if (line.startsWith("### ")) {
      flushList();
      html += `<h3 class="subsection-title">${inlineFormat(line.slice(4))}</h3>\n`;
      continue;
    }
    if (line.startsWith("#### ")) {
      flushList();
      html += `<h4 class="sub-subsection-title">${inlineFormat(line.slice(5))}</h4>\n`;
      continue;
    }

    // Horizontal Rule
    if (line.trim() === "---") {
      flushList();
      html += `<hr class="divider" />\n`;
      continue;
    }

    // Lists
    if (line.trim().startsWith("* ") || line.trim().startsWith("- ")) {
      if (!inList) {
        html += "<ul>\n";
        inList = true;
      }
      html += `  <li>${inlineFormat(line.trim().slice(2))}</li>\n`;
      continue;
    } else {
      flushList();
    }

    // Numbered Lists
    const numMatch = line.trim().match(/^(\d+)\.\s+(.*)$/);
    if (numMatch) {
      html += `<div class="numbered-item"><span class="item-num">${numMatch[1]}.</span> <span class="item-text">${inlineFormat(numMatch[2])}</span></div>\n`;
      continue;
    }

    // Standard Paragraph
    if (line.trim().length > 0) {
      html += `<p>${inlineFormat(line)}</p>\n`;
    }
  }

  flushList();
  flushTable();

  return html;
}

const bodyHtml = parseMarkdown(mdContent);

const completeHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>GETRA Backend Complete Technical Documentation</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 18mm 14mm 18mm 14mm;
      @bottom-right {
        content: counter(page);
        font-family: 'Segoe UI', Arial, sans-serif;
        font-size: 8pt;
        color: #718096;
      }
      @top-right {
        content: "GETRA Backend Technical Documentation";
        font-family: 'Segoe UI', Arial, sans-serif;
        font-size: 8pt;
        color: #a0aec0;
      }
    }

    * {
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #1a202c;
      line-height: 1.55;
      font-size: 9.5pt;
      margin: 0;
      padding: 0;
    }

    /* Cover Page */
    .cover-page {
      page-break-after: always;
      height: 92vh;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      border: 2px solid #2b6cb0;
      border-radius: 8px;
      padding: 40px 30px;
      background: linear-gradient(180deg, #ebf8ff 0%, #ffffff 40%);
    }

    .cover-header {
      border-bottom: 3px solid #3182ce;
      padding-bottom: 20px;
    }

    .cover-badge {
      display: inline-block;
      background-color: #2b6cb0;
      color: white;
      font-size: 9pt;
      font-weight: 700;
      padding: 4px 12px;
      border-radius: 4px;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 12px;
    }

    .cover-title {
      font-size: 26pt;
      font-weight: 800;
      color: #1a365d;
      margin: 0 0 8px 0;
      line-height: 1.15;
    }

    .cover-subtitle {
      font-size: 13pt;
      color: #4a5568;
      margin: 0;
      line-height: 1.4;
      font-weight: 400;
    }

    .cover-meta {
      background: #f7fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 20px;
      margin: 30px 0;
    }

    .cover-meta-table {
      width: 100%;
      border-collapse: collapse;
    }

    .cover-meta-table td {
      padding: 6px 10px;
      font-size: 9.5pt;
      border-bottom: 1px solid #edf2f7;
    }

    .cover-meta-table td.label {
      font-weight: 700;
      color: #4a5568;
      width: 32%;
    }

    .cover-meta-table td.value {
      color: #1a202c;
      font-family: 'Consolas', monospace;
    }

    .cover-footer {
      border-top: 1px solid #cbd5e0;
      padding-top: 15px;
      display: flex;
      justify-content: space-between;
      color: #718096;
      font-size: 8.5pt;
    }

    /* Headings */
    h1.doc-main-title {
      font-size: 18pt;
      font-weight: 800;
      color: #1a365d;
      border-bottom: 2px solid #3182ce;
      padding-bottom: 6px;
      margin-top: 20px;
      margin-bottom: 15px;
    }

    h2.section-title {
      font-size: 13pt;
      font-weight: 700;
      color: #2b6cb0;
      border-bottom: 1.5px solid #e2e8f0;
      padding-bottom: 4px;
      margin-top: 22px;
      margin-bottom: 10px;
    }

    h3.subsection-title {
      font-size: 10.5pt;
      font-weight: 700;
      color: #2d3748;
      margin-top: 14px;
      margin-bottom: 6px;
    }

    h4.sub-subsection-title {
      font-size: 9.5pt;
      font-weight: 600;
      color: #4a5568;
      margin-top: 10px;
      margin-bottom: 4px;
    }

    .chapter-break {
      page-break-before: always;
    }

    p {
      margin: 0 0 8px 0;
      text-align: justify;
    }

    /* Code Blocks */
    pre.code-block {
      background-color: #1e293b;
      color: #f8fafc;
      border-radius: 6px;
      padding: 0;
      margin: 8px 0 12px 0;
      font-family: 'Consolas', 'Courier New', monospace;
      font-size: 8pt;
      line-height: 1.4;
      overflow-x: hidden;
      border: 1px solid #334155;
      page-break-inside: avoid;
    }

    .code-header {
      background: #0f172a;
      color: #94a3b8;
      font-size: 7pt;
      font-weight: 700;
      padding: 3px 10px;
      border-bottom: 1px solid #334155;
      border-top-left-radius: 5px;
      border-top-right-radius: 5px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    pre.code-block code {
      display: block;
      padding: 8px 12px;
      white-space: pre-wrap;
      word-break: break-all;
    }

    code {
      font-family: 'Consolas', 'Courier New', monospace;
      background-color: #edf2f7;
      color: #c53030;
      padding: 1px 4px;
      border-radius: 3px;
      font-size: 8.5pt;
    }

    /* Tables */
    .table-container {
      width: 100%;
      margin: 10px 0 14px 0;
      page-break-inside: avoid;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 8.5pt;
    }

    th, td {
      border: 1px solid #cbd5e0;
      padding: 5px 8px;
      text-align: left;
      vertical-align: top;
    }

    th {
      background-color: #edf2f7;
      color: #2d3748;
      font-weight: 700;
    }

    tr:nth-child(even) {
      background-color: #f7fafc;
    }

    /* Alerts */
    .alert {
      border-left: 4px solid #3182ce;
      background-color: #ebf8ff;
      border-radius: 4px;
      padding: 8px 12px;
      margin: 10px 0;
      page-break-inside: avoid;
    }

    .alert-title {
      font-weight: 700;
      font-size: 8.5pt;
      text-transform: uppercase;
      margin-bottom: 3px;
      color: #2b6cb0;
    }

    .alert-note {
      border-left-color: #3182ce;
      background-color: #ebf8ff;
    }
    .alert-note .alert-title { color: #2b6cb0; }

    .alert-tip {
      border-left-color: #38a169;
      background-color: #f0fff4;
    }
    .alert-tip .alert-title { color: #2f855a; }

    .alert-important {
      border-left-color: #805ad5;
      background-color: #faf5ff;
    }
    .alert-important .alert-title { color: #6b46c1; }

    .alert-warning {
      border-left-color: #dd6b20;
      background-color: #fffaf0;
    }
    .alert-warning .alert-title { color: #c05621; }

    .alert-caution {
      border-left-color: #e53e3e;
      background-color: #fff5f5;
    }
    .alert-caution .alert-title { color: #c53030; }

    .alert p {
      margin: 0;
      font-size: 8.5pt;
      color: #2d3748;
    }

    /* Lists */
    ul {
      margin: 4px 0 8px 16px;
      padding: 0;
    }

    li {
      margin-bottom: 3px;
    }

    .numbered-item {
      margin-bottom: 4px;
    }

    .item-num {
      font-weight: 700;
      color: #2b6cb0;
      display: inline-block;
      width: 18px;
    }

    hr.divider {
      border: 0;
      height: 1px;
      background: #e2e8f0;
      margin: 16px 0;
    }
  </style>
</head>
<body>

  <!-- Cover Page -->
  <div class="cover-page">
    <div class="cover-header">
      <div class="cover-badge">Official Architecture & Operational Manual</div>
      <h1 class="cover-title">GETRA Backend</h1>
      <p class="cover-subtitle">Complete Technical Documentation, API Catalog, Database & PostGIS Foundation, Supabase Migration Runbook, Docker Operations & Security Handover</p>
    </div>

    <div class="cover-meta">
      <table class="cover-meta-table">
        <tr>
          <td class="label">Project</td>
          <td class="value">GETRA (Gerakan Transit Ramah Anak)</td>
        </tr>
        <tr>
          <td class="label">Document Version</td>
          <td class="value">1.0.0 (Final Backend Baseline)</td>
        </tr>
        <tr>
          <td class="label">Release Phase</td>
          <td class="value">Extra Phase Final — Documentation & Handover</td>
        </tr>
        <tr>
          <td class="label">Runtime Stack</td>
          <td class="value">Next.js 16.3.1 Standalone / Node 22 LTS</td>
        </tr>
        <tr>
          <td class="label">Database Platform</td>
          <td class="value">Supabase PostgreSQL 15+ with PostGIS</td>
        </tr>
        <tr>
          <td class="label">Supabase Project Ref</td>
          <td class="value">sesakxnjaphrxqxllqjm</td>
        </tr>
        <tr>
          <td class="label">Audit Status</td>
          <td class="value">VERIFIED & 100% AUDITED AGAINST REPOSITORY</td>
        </tr>
        <tr>
          <td class="label">Date</td>
          <td class="value">2026-08-17 (Asia/Jakarta)</td>
        </tr>
      </table>
    </div>

    <div class="cover-footer">
      <div>GETRA Core Engineering Team</div>
      <div>Confidential & Internal Engineering Specification</div>
    </div>
  </div>

  <!-- Main Content -->
  <div class="document-content">
    ${bodyHtml}
  </div>

</body>
</html>
`;

fs.writeFileSync(htmlPath, completeHtml, "utf-8");
console.log("HTML file created successfully:", htmlPath);

// Invoke Chrome Headless to generate the PDF
try {
  const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
  const cmd = `"${chromePath}" --headless=new --disable-gpu --no-pdf-header-footer --print-to-pdf="${pdfPath}" "${htmlPath}"`;
  console.log("Executing Chrome headless PDF render...");
  execSync(cmd, { stdio: "inherit" });
  
  const stats = fs.statSync(pdfPath);
  console.log(`PDF successfully generated at: ${pdfPath} (${stats.size} bytes)`);
} catch (err) {
  console.error("PDF generation failed:", err);
  process.exit(1);
}
