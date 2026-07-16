/**
 * REPORTING-EXPORT-TEMPLATES-ACCEPTANCE-2
 * Capture Cover / Executive / Financial / Revenue Trend from generated samples.
 * Renders Excel merges as colspan/rowspan so screenshots match Excel.
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import ExcelJS from "exceljs";
import { chromium } from "playwright";

const root = process.cwd();
const samplesDir = join(
  root,
  "docs/engineering/programs/REPORTING-EXPORT-TEMPLATES-ACCEPTANCE-2/samples"
);
const shotsDir = join(
  root,
  "docs/engineering/programs/REPORTING-EXPORT-TEMPLATES-ACCEPTANCE-2/screenshots"
);

function argbToCss(argb) {
  if (!argb || typeof argb !== "string") return null;
  if (/^[0-9A-Fa-f]{8}$/.test(argb)) return `#${argb.slice(2)}`;
  return null;
}

function cellStyle(cell) {
  const fill = cell.fill?.fgColor?.argb
    ? argbToCss(cell.fill.fgColor.argb)
    : null;
  const color = cell.font?.color?.argb
    ? argbToCss(cell.font.color.argb)
    : "#0F172A";
  const size = cell.font?.size || 12;
  const weight = cell.font?.bold ? 700 : 500;
  const align = cell.alignment?.horizontal || "left";
  return [
    fill ? `background:${fill}` : "background:#fff",
    `color:${color}`,
    `font-size:${size}px`,
    `font-weight:${weight}`,
    `text-align:${align}`,
  ]
    .filter(Boolean)
    .join(";");
}

function buildMergeMap(sheet) {
  /** @type {Map<string, {rowspan:number, colspan:number}>} */
  const masters = new Map();
  /** @type {Set<string>} */
  const covered = new Set();
  const merges = sheet.model?.merges || [];
  for (const range of merges) {
    // e.g. "A1:H1"
    const m = String(range).match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/);
    if (!m) continue;
    const c1 = colToNum(m[1]);
    const r1 = Number(m[2]);
    const c2 = colToNum(m[3]);
    const r2 = Number(m[4]);
    masters.set(`${r1}:${c1}`, { rowspan: r2 - r1 + 1, colspan: c2 - c1 + 1 });
    for (let r = r1; r <= r2; r++) {
      for (let c = c1; c <= c2; c++) {
        if (r === r1 && c === c1) continue;
        covered.add(`${r}:${c}`);
      }
    }
  }
  return { masters, covered };
}

function colToNum(letters) {
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n;
}

function sheetToHtml(sheet, title, maxRows = 36, maxCols = 8, logoDataUrl = null) {
  const { masters, covered } = buildMergeMap(sheet);
  const rows = [];
  for (let r = 1; r <= Math.min(sheet.rowCount || maxRows, maxRows); r++) {
    const row = sheet.getRow(r);
    const cells = [];
    for (let c = 1; c <= maxCols; c++) {
      const key = `${r}:${c}`;
      if (covered.has(key)) continue;
      const cell = row.getCell(c);
      const value = cell.value == null ? "" : String(cell.value);
      const h = row.height || 22;
      const merge = masters.get(key);
      const span = merge
        ? ` colspan="${merge.colspan}" rowspan="${merge.rowspan}"`
        : "";
      cells.push(
        `<td${span} style="${cellStyle(cell)};height:${h}px;padding:8px 12px;border:1px solid #E2E8F0;vertical-align:middle">${escapeHtml(
          value
        )}</td>`
      );
    }
    if (cells.length) rows.push(`<tr>${cells.join("")}</tr>`);
  }

  const logoImg = logoDataUrl
    ? `<img class="logo" src="${logoDataUrl}" alt="logo"/>`
    : "";

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8"/>
<title>${escapeHtml(title)}</title>
<style>
  body { margin: 0; background: #94a3b8; font-family: Calibri, Arial, sans-serif; }
  .wrap { width: 1100px; margin: 20px auto; background: #fff; box-shadow: 0 10px 40px rgba(15,23,42,.15); padding: 8px; position: relative; }
  h2 { margin: 8px 12px; color: #0B1F33; font-family: system-ui, sans-serif; }
  table { border-collapse: collapse; width: 100%; table-layout: fixed; }
  .logo { position: absolute; top: 70px; left: 50%; transform: translateX(-50%); width: 110px; height: 110px; object-fit: contain; background: #fff; border-radius: 10px; padding: 6px; z-index: 2; box-shadow: 0 2px 10px rgba(0,0,0,.15); }
</style>
</head>
<body>
  <div class="wrap">
    <h2>${escapeHtml(title)}</h2>
    ${logoImg}
    <table>${rows.join("")}</table>
  </div>
</body>
</html>`;
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

async function capturePdfPages(page, pdfPath, outPrefix) {
  const pdfData = readFileSync(pdfPath);
  const b64 = pdfData.toString("base64");
  const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8"/>
<script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
<style>
  body { margin: 0; background: #64748b; }
  #pages { display: flex; flex-direction: column; gap: 16px; padding: 16px; align-items: center; }
  canvas { background: #fff; box-shadow: 0 8px 24px rgba(0,0,0,.2); }
</style>
</head>
<body>
<div id="pages"></div>
<script>
pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
const data = atob("${b64}");
const bytes = new Uint8Array(data.length);
for (let i = 0; i < data.length; i++) bytes[i] = data.charCodeAt(i);
(async () => {
  const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
  const root = document.getElementById("pages");
  const count = Math.min(pdf.numPages, 4);
  for (let i = 1; i <= count; i++) {
    const p = await pdf.getPage(i);
    const viewport = p.getViewport({ scale: 1.4 });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    root.appendChild(canvas);
    await p.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;
  }
  document.title = "pdf-ready-" + count;
})();
</script>
</body>
</html>`;

  const htmlPath = join(shotsDir, `${outPrefix}-pdf-render.html`);
  writeFileSync(htmlPath, html, "utf8");
  await page.goto(pathToFileURL(htmlPath).href, { waitUntil: "networkidle" });
  await page.waitForFunction(() => document.title.startsWith("pdf-ready-"), null, {
    timeout: 60_000,
  });
  const canvases = page.locator("canvas");
  const n = await canvases.count();
  for (let i = 0; i < n; i++) {
    await canvases.nth(i).screenshot({
      path: join(shotsDir, `${outPrefix}-pdf-page-${i + 1}.png`),
    });
  }
}

async function main() {
  mkdirSync(shotsDir, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 1100 } });
  const logoPath = join(root, "client/public/mineuqr-logo.png");
  const logoDataUrl = existsSync(logoPath)
    ? `data:image/png;base64,${readFileSync(logoPath).toString("base64")}`
    : null;

  for (const lang of ["en", "ar"]) {
    const stem = `reporting-acceptance2-${lang}-2026-07`;
    const xlsxPath = join(samplesDir, `${stem}.xlsx`);
    const pdfPath = join(samplesDir, `${stem}.pdf`);
    if (!existsSync(xlsxPath) || !existsSync(pdfPath)) {
      throw new Error(
        `Missing samples. Run: pnpm exec vitest run client/src/lib/reporting-exports/__tests__/reportingExportAcceptance.samples.test.ts`
      );
    }

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(xlsxPath);
    const coverName = lang === "ar" ? "الغلاف" : "Cover";
    const execName = lang === "ar" ? "الملخص التنفيذي" : "Executive Summary";
    const finName = lang === "ar" ? "الملخص المالي" : "Financial Summary";
    const trendName = lang === "ar" ? "اتجاه الإيرادات" : "Revenue Trends";

    for (const [name, shot, withLogo] of [
      [coverName, `cover-${lang}`, true],
      [execName, `executive-${lang}`, false],
      [finName, `financial-${lang}`, false],
      [trendName, `revenue-trend-${lang}`, false],
    ]) {
      const sheet = wb.getWorksheet(name);
      if (!sheet) throw new Error(`Missing sheet ${name}`);
      const html = sheetToHtml(
        sheet,
        `${name} (${stem}.xlsx)`,
        name === trendName ? 40 : 34,
        8,
        withLogo ? logoDataUrl : null
      );
      const htmlPath = join(shotsDir, `${shot}.html`);
      writeFileSync(htmlPath, html, "utf8");
      await page.goto(pathToFileURL(htmlPath).href);
      await page.locator(".wrap").screenshot({
        path: join(shotsDir, `${shot}.png`),
      });
    }

    await capturePdfPages(page, pdfPath, stem);
  }

  await browser.close();
  console.log(`[acceptance-2] Screenshots written to ${shotsDir}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
