/**
 * REPORTING-EXPORT-TEMPLATES-ACCEPTANCE-1
 * Capture Cover / Executive / Financial visuals from generated XLSX + PDF samples.
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import ExcelJS from "exceljs";
import { chromium } from "playwright";

const root = process.cwd();
const samplesDir = join(
  root,
  "docs/engineering/programs/REPORTING-EXPORT-TEMPLATES-ACCEPTANCE-1/samples"
);
const shotsDir = join(
  root,
  "docs/engineering/programs/REPORTING-EXPORT-TEMPLATES-ACCEPTANCE-1/screenshots"
);

function argbToCss(argb) {
  if (!argb || typeof argb !== "string") return null;
  const hex = argb.replace(/^FF/i, "#");
  if (/^#[0-9A-Fa-f]{6}$/.test(hex)) return hex;
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
    fill ? `background:${fill}` : "",
    `color:${color}`,
    `font-size:${size}px`,
    `font-weight:${weight}`,
    `text-align:${align}`,
  ]
    .filter(Boolean)
    .join(";");
}

function sheetToHtml(sheet, title, maxRows = 28, maxCols = 6, logoDataUrl = null) {
  const rows = [];
  for (let r = 1; r <= Math.min(sheet.rowCount || maxRows, maxRows); r++) {
    const row = sheet.getRow(r);
    const cells = [];
    for (let c = 1; c <= maxCols; c++) {
      const cell = row.getCell(c);
      const value = cell.value == null ? "" : String(cell.value);
      const h = row.height || 22;
      cells.push(
        `<td style="${cellStyle(cell)};height:${h}px;padding:6px 10px;border:1px solid #E2E8F0;vertical-align:middle">${escapeHtml(
          value
        )}</td>`
      );
    }
    rows.push(`<tr>${cells.join("")}</tr>`);
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
  body { margin: 0; background: #cbd5e1; font-family: Calibri, Arial, sans-serif; }
  .wrap { width: 1100px; margin: 20px auto; background: #fff; box-shadow: 0 10px 40px rgba(15,23,42,.15); padding: 8px; position: relative; }
  h2 { margin: 8px 12px; color: #0F766E; font-family: system-ui, sans-serif; }
  table { border-collapse: collapse; width: 100%; table-layout: fixed; }
  .logo { position: absolute; top: 52px; left: 28px; width: 68px; height: 68px; object-fit: contain; background: #fff; border-radius: 8px; padding: 4px; z-index: 2; box-shadow: 0 2px 8px rgba(0,0,0,.12); }
  .wrap.rtl .logo { left: auto; right: 28px; }
</style>
</head>
<body>
  <div class="wrap ${/الغلاف|الملخص|ar/i.test(title) ? "rtl" : ""}">
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
  body { margin: 0; background: #94a3b8; }
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
  const count = Math.min(pdf.numPages, 3);
  for (let i = 1; i <= count; i++) {
    const p = await pdf.getPage(i);
    const viewport = p.getViewport({ scale: 1.45 });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    canvas.dataset.page = String(i);
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
  const page = await browser.newPage({ viewport: { width: 1200, height: 1000 } });
  const logoPath = join(root, "client/public/mineuqr-logo.png");
  const logoDataUrl = existsSync(logoPath)
    ? `data:image/png;base64,${readFileSync(logoPath).toString("base64")}`
    : null;

  for (const lang of ["en", "ar"]) {
    const stem = `reporting-acceptance-${lang}-2026-07`;
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

    for (const [name, shot] of [
      [coverName, `cover-${lang}`],
      [execName, `executive-${lang}`],
      [finName, `financial-${lang}`],
    ]) {
      const sheet = wb.getWorksheet(name);
      if (!sheet) throw new Error(`Missing sheet ${name}`);
      const html = sheetToHtml(
        sheet,
        `${name} (${stem}.xlsx)`,
        28,
        6,
        shot.startsWith("cover") ? logoDataUrl : null
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
  console.log(`[acceptance] Screenshots written to ${shotsDir}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
