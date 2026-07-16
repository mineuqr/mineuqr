/**
 * REPORTING-PERIOD-CONSISTENCY-1
 * Capture every Excel worksheet from monthly/yearly samples.
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
  "docs/engineering/programs/REPORTING-PERIOD-CONSISTENCY-1/samples"
);
const shotsDir = join(
  root,
  "docs/engineering/programs/REPORTING-PERIOD-CONSISTENCY-1/screenshots"
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

async function main() {
  mkdirSync(shotsDir, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 1100 } });
  const logoPath = join(root, "client/public/mineuqr-logo.png");
  const logoDataUrl = existsSync(logoPath)
    ? `data:image/png;base64,${readFileSync(logoPath).toString("base64")}`
    : null;

  for (const scope of [
    { stem: "reporting-consistency-en-2026-07", label: "month" },
    { stem: "reporting-consistency-en-2026", label: "year" },
  ]) {
    const xlsxPath = join(samplesDir, `${scope.stem}.xlsx`);
    if (!existsSync(xlsxPath)) {
      throw new Error(
        `Missing samples. Run: pnpm exec vitest run client/src/lib/reporting-exports/__tests__/reportingExportAcceptance.samples.test.ts`
      );
    }

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(xlsxPath);

    for (const sheet of wb.worksheets) {
      const shot = `${scope.label}-${sheet.name.toLowerCase().replace(/\s+/g, "-")}`;
      const html = sheetToHtml(
        sheet,
        `${sheet.name} (${scope.stem}.xlsx)`,
        sheet.name.includes("Trend") || sheet.name.includes("Sales") ? 42 : 34,
        8,
        sheet.name === "Cover" || sheet.name === "الغلاف" ? logoDataUrl : null
      );
      const htmlPath = join(shotsDir, `${shot}.html`);
      writeFileSync(htmlPath, html, "utf8");
      await page.goto(pathToFileURL(htmlPath).href);
      await page.locator(".wrap").screenshot({
        path: join(shotsDir, `${shot}.png`),
      });
    }
  }

  await browser.close();
  console.log(`[consistency-1] Screenshots written to ${shotsDir}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
