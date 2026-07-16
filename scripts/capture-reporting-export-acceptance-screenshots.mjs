/**
 * REPORTING-EXCEL-UX-POLISH-1
 * Capture every Excel worksheet from monthly/yearly polished samples.
 * Renders merges + embedded chart/logo images so screenshots match Excel.
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import ExcelJS from "exceljs";
import { chromium } from "playwright";

const root = process.cwd();
const samplesDir = join(
  root,
  "docs/engineering/programs/REPORTING-EXCEL-UX-POLISH-1/samples"
);
const shotsDir = join(
  root,
  "docs/engineering/programs/REPORTING-EXCEL-UX-POLISH-1/screenshots"
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

function imageDataUrl(workbook, imageId) {
  try {
    const img = workbook.getImage(Number(imageId));
    if (!img?.buffer) return null;
    const buf = Buffer.from(img.buffer);
    const ext = img.extension || "png";
    return `data:image/${ext};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

/** ExcelJS Anchor offsets are EMUs (English Metric Units). ~9525 EMU ≈ 1 CSS px @ 96dpi. */
const EMU_PER_PX = 9525;

function rowTopPx(sheet, nativeRow) {
  let y = 0;
  for (let r = 1; r <= nativeRow; r++) {
    const h = sheet.getRow(r).height;
    y += h ? h * 1.33 : 22;
  }
  return y;
}

function sheetImagesHtml(workbook, sheet, colWidthPx, titleOffsetPx = 48) {
  const images = sheet.getImages?.() || [];
  const parts = [];
  for (const img of images) {
    const dataUrl = imageDataUrl(workbook, img.imageId);
    if (!dataUrl) continue;
    const tl = img.range?.tl;
    if (!tl) continue;
    const left = Math.round(
      tl.nativeCol * colWidthPx + (tl.nativeColOff || 0) / EMU_PER_PX
    );
    const top = Math.round(
      titleOffsetPx +
        rowTopPx(sheet, tl.nativeRow) +
        (tl.nativeRowOff || 0) / EMU_PER_PX
    );
    const ext = img.range?.ext || { width: 900, height: 320 };
    // Cap display width to wrap so charts read as full-width executive visuals
    const dispW = Math.min(ext.width, 1200);
    const dispH = Math.round(ext.height * (dispW / ext.width));
    parts.push(
      `<img class="embedded" src="${dataUrl}" style="left:${Math.max(8, left)}px;top:${top}px;width:${dispW}px;height:${dispH}px" alt="chart"/>`
    );
  }
  return parts.join("\n");
}

function sheetToHtml(
  workbook,
  sheet,
  title,
  maxRows = 48,
  maxCols = 12,
  logoDataUrl = null
) {
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

  const wrapWidth = 1280;
  const colWidthPx = wrapWidth / maxCols;
  const isCover = sheet.name === "Cover" || sheet.name === "الغلاف";
  // Cover uses the public logo asset for fidelity; other sheets embed workbook charts.
  const embedded = isCover
    ? ""
    : sheetImagesHtml(workbook, sheet, colWidthPx);

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
  .wrap { width: ${wrapWidth}px; margin: 20px auto; background: #fff; box-shadow: 0 10px 40px rgba(15,23,42,.15); padding: 8px; position: relative; }
  h2 { margin: 8px 12px; color: #0B1F33; font-family: system-ui, sans-serif; }
  table { border-collapse: collapse; width: 100%; table-layout: fixed; }
  .logo { position: absolute; top: 70px; left: 50%; transform: translateX(-50%); width: 120px; height: 120px; object-fit: contain; background: #fff; border-radius: 10px; padding: 6px; z-index: 2; box-shadow: 0 2px 10px rgba(0,0,0,.15); }
  .embedded { position: absolute; z-index: 3; object-fit: contain; border: 1px solid #D6DEE8; background: #fff; }
</style>
</head>
<body>
  <div class="wrap">
    <h2>${escapeHtml(title)}</h2>
    ${logoImg}
    ${embedded}
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
  const page = await browser.newPage({ viewport: { width: 1400, height: 1600 } });
  const logoPath = join(root, "client/public/mineuqr-logo.png");
  const logoDataUrl = existsSync(logoPath)
    ? `data:image/png;base64,${readFileSync(logoPath).toString("base64")}`
    : null;

  for (const scope of [
    { stem: "reporting-excel-ux-en-2026-07", label: "month" },
    { stem: "reporting-excel-ux-en-2026", label: "year" },
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
      const tall =
        sheet.name.includes("Trend") ||
        sheet.name.includes("Sales") ||
        sheet.name.includes("اتجاه") ||
        sheet.name.includes("مبيعات");
      const html = sheetToHtml(
        wb,
        sheet,
        `${sheet.name} (${scope.stem}.xlsx)`,
        tall ? 55 : 40,
        12,
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
  console.log(`[excel-ux-polish-1] Screenshots written to ${shotsDir}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
