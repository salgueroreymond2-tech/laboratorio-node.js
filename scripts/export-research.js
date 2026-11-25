import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";

// Exports the project's research using a local browser; it never fetches resources.
const edge =
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const input = resolve("docs/deep-research.md");
const output = resolve("docs/deep-research.pdf");
const temporary = mkdtempSync(join(tmpdir(), "securevault-research-"));
const htmlPath = join(temporary, "research.html");
const escape = (s) =>
  s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
const inline = (s) =>
  escape(s)
    .replace(/\[([^\]]+)\]\((https:\/\/[^)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, "<code>$1</code>");
const lines = readFileSync(input, "utf8").split(/\r?\n/);
const blocks = [];
for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim();
  if (!line) continue;
  if (line.startsWith("~~~")) {
    const code = [];
    while (++i < lines.length && !lines[i].trim().startsWith("~~~"))
      code.push(lines[i]);
    blocks.push(`<pre>${escape(code.join("\n"))}</pre>`);
  } else if (line.startsWith("|")) {
    const rows = [];
    while (i < lines.length && lines[i].trim().startsWith("|")) {
      const cells = lines[i]
        .trim()
        .slice(1, -1)
        .split("|")
        .map((cell) => cell.trim());
      if (!cells.every((cell) => /^:?-{2,}:?$/.test(cell))) rows.push(cells);
      i++;
    }
    i--;
    blocks.push(
      `<table>${rows.map((row, index) => `<tr>${row.map((cell) => (index === 0 ? `<th>${inline(cell)}</th>` : `<td>${inline(cell)}</td>`)).join("")}</tr>`).join("")}</table>`,
    );
  } else if (/^#{1,3}\s/.test(line)) {
    const level = line.match(/^#+/)[0].length;
    blocks.push(`<h${level}>${inline(line.slice(level).trim())}</h${level}>`);
  } else {
    blocks.push(`<p>${inline(line)}</p>`);
  }
}
const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>SecureVault - investigación</title><style>@page{size:A4;margin:12mm}body{font-family:Arial,sans-serif;font-size:9pt;line-height:1.2;color:#172033}h1{font-size:16pt}h2{font-size:11pt;margin:10px 0 5px;break-after:avoid}p{margin:5px 0}table{border-collapse:collapse;width:100%;font-size:8pt;line-height:1.15}th,td{border:1px solid #999;padding:3px;vertical-align:top}th{background:#edf1f6}tr{break-inside:avoid}pre{font-size:8pt;white-space:pre-wrap}a{color:#174ca0;overflow-wrap:anywhere}</style></head><body>${blocks.join("\n")}</body></html>`;
writeFileSync(htmlPath, html, "utf8");
const browser = spawnSync(
  edge,
  [
    "--headless",
    "--disable-gpu",
    "--disable-background-networking",
    "--disable-extensions",
    "--no-pdf-header-footer",
    `--user-data-dir=${join(temporary, "profile")}`,
    `--print-to-pdf=${output}`,
    pathToFileURL(htmlPath).href,
  ],
  { encoding: "utf8", timeout: 30000, windowsHide: true },
);
if (browser.status !== 0) {
  console.error("No se pudo exportar el PDF con el navegador local.");
  process.exitCode = 1;
} else {
  const pdf = readFileSync(output).toString("latin1");
  const pages = (pdf.match(/\/Type\s*\/Page\b/g) || []).length;
  if (pages < 2 || pages > 4) {
    console.error(
      `PDF generado, pero su paginación (${pages}) requiere revisión.`,
    );
    process.exitCode = 1;
  } else {
    console.log(`PDF generado: ${pages} páginas.`);
  }
}
