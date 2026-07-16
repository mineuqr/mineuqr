/**
 * REPORTING-EXCEL-UX-POLISH-1 — executive trend chart PNG for Excel.
 * Works in browser (canvas) and Node (pure PNG) so sample workbooks always embed charts.
 * Presentation scaling only — does not invent KPI values.
 */
import { deflateSync } from "node:zlib";

export type TrendChartSeries = Readonly<{
  label: string;
  values: readonly number[];
}>;

function maxOf(values: readonly number[]): number {
  let max = 0;
  for (const v of values) {
    if (v > max) max = v;
  }
  return max;
}

function crc32(buf: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i]!;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
  }
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Uint8Array): Uint8Array {
  const typeBytes = new TextEncoder().encode(type);
  const len = data.length;
  const out = new Uint8Array(12 + len);
  out[0] = (len >>> 24) & 0xff;
  out[1] = (len >>> 16) & 0xff;
  out[2] = (len >>> 8) & 0xff;
  out[3] = len & 0xff;
  out.set(typeBytes, 4);
  out.set(data, 8);
  const crcBuf = new Uint8Array(4 + len);
  crcBuf.set(typeBytes, 0);
  crcBuf.set(data, 4);
  const crc = crc32(crcBuf);
  const o = 8 + len;
  out[o] = (crc >>> 24) & 0xff;
  out[o + 1] = (crc >>> 16) & 0xff;
  out[o + 2] = (crc >>> 8) & 0xff;
  out[o + 3] = crc & 0xff;
  return out;
}

function encodePngRgba(width: number, height: number, rgba: Uint8Array): Uint8Array {
  const raw = new Uint8Array((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    const rowStart = y * (width * 4 + 1);
    raw[rowStart] = 0;
    raw.set(rgba.subarray(y * width * 4, (y + 1) * width * 4), rowStart + 1);
  }
  const compressed = deflateSync(raw);
  const signature = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = new Uint8Array(13);
  ihdr[0] = (width >>> 24) & 0xff;
  ihdr[1] = (width >>> 16) & 0xff;
  ihdr[2] = (width >>> 8) & 0xff;
  ihdr[3] = width & 0xff;
  ihdr[4] = (height >>> 24) & 0xff;
  ihdr[5] = (height >>> 16) & 0xff;
  ihdr[6] = (height >>> 8) & 0xff;
  ihdr[7] = height & 0xff;
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const parts = [
    signature,
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", compressed),
    pngChunk("IEND", new Uint8Array(0)),
  ];
  let total = 0;
  for (const p of parts) total += p.length;
  const out = new Uint8Array(total);
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.length;
  }
  return out;
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    Number.parseInt(h.slice(0, 2), 16),
    Number.parseInt(h.slice(2, 4), 16),
    Number.parseInt(h.slice(4, 6), 16),
  ];
}

function fillRect(
  rgba: Uint8Array,
  width: number,
  x0: number,
  y0: number,
  w: number,
  h: number,
  color: [number, number, number]
) {
  const x1 = Math.max(0, Math.floor(x0));
  const y1 = Math.max(0, Math.floor(y0));
  const x2 = Math.min(width, Math.ceil(x0 + w));
  const y2 = Math.min(rgba.length / (width * 4) / 1, Math.ceil(y0 + h));
  const height = rgba.length / (width * 4);
  const yy2 = Math.min(height, y2);
  for (let y = y1; y < yy2; y++) {
    for (let x = x1; x < x2; x++) {
      const i = (y * width + x) * 4;
      rgba[i] = color[0];
      rgba[i + 1] = color[1];
      rgba[i + 2] = color[2];
      rgba[i + 3] = 255;
    }
  }
}

/** 5x7 bitmap glyphs for Western digits + full Latin (chart titles / axis). */
const GLYPHS: Record<string, number[]> = {
  "0": [0x0e, 0x11, 0x13, 0x15, 0x19, 0x11, 0x0e],
  "1": [0x04, 0x0c, 0x04, 0x04, 0x04, 0x04, 0x0e],
  "2": [0x0e, 0x11, 0x01, 0x06, 0x08, 0x10, 0x1f],
  "3": [0x1e, 0x01, 0x01, 0x0e, 0x01, 0x01, 0x1e],
  "4": [0x02, 0x06, 0x0a, 0x12, 0x1f, 0x02, 0x02],
  "5": [0x1f, 0x10, 0x1e, 0x01, 0x01, 0x11, 0x0e],
  "6": [0x0e, 0x10, 0x10, 0x1e, 0x11, 0x11, 0x0e],
  "7": [0x1f, 0x01, 0x02, 0x04, 0x08, 0x08, 0x08],
  "8": [0x0e, 0x11, 0x11, 0x0e, 0x11, 0x11, 0x0e],
  "9": [0x0e, 0x11, 0x11, 0x0f, 0x01, 0x01, 0x0e],
  " ": [0, 0, 0, 0, 0, 0, 0],
  ".": [0, 0, 0, 0, 0, 0x0c, 0x0c],
  ",": [0, 0, 0, 0, 0x0c, 0x04, 0x08],
  "-": [0, 0, 0, 0x1f, 0, 0, 0],
  ":": [0, 0x0c, 0x0c, 0, 0x0c, 0x0c, 0],
  A: [0x0e, 0x11, 0x11, 0x1f, 0x11, 0x11, 0x11],
  B: [0x1e, 0x11, 0x11, 0x1e, 0x11, 0x11, 0x1e],
  C: [0x0e, 0x11, 0x10, 0x10, 0x10, 0x11, 0x0e],
  D: [0x1e, 0x11, 0x11, 0x11, 0x11, 0x11, 0x1e],
  E: [0x1f, 0x10, 0x10, 0x1e, 0x10, 0x10, 0x1f],
  F: [0x1f, 0x10, 0x10, 0x1e, 0x10, 0x10, 0x10],
  G: [0x0e, 0x11, 0x10, 0x17, 0x11, 0x11, 0x0e],
  H: [0x11, 0x11, 0x11, 0x1f, 0x11, 0x11, 0x11],
  I: [0x0e, 0x04, 0x04, 0x04, 0x04, 0x04, 0x0e],
  J: [0x01, 0x01, 0x01, 0x01, 0x11, 0x11, 0x0e],
  K: [0x11, 0x12, 0x14, 0x18, 0x14, 0x12, 0x11],
  L: [0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x1f],
  M: [0x11, 0x1b, 0x15, 0x11, 0x11, 0x11, 0x11],
  N: [0x11, 0x19, 0x15, 0x13, 0x11, 0x11, 0x11],
  O: [0x0e, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0e],
  P: [0x1e, 0x11, 0x11, 0x1e, 0x10, 0x10, 0x10],
  Q: [0x0e, 0x11, 0x11, 0x11, 0x15, 0x12, 0x0d],
  R: [0x1e, 0x11, 0x11, 0x1e, 0x14, 0x12, 0x11],
  S: [0x0e, 0x11, 0x10, 0x0e, 0x01, 0x11, 0x0e],
  T: [0x1f, 0x04, 0x04, 0x04, 0x04, 0x04, 0x04],
  U: [0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0e],
  V: [0x11, 0x11, 0x11, 0x11, 0x11, 0x0a, 0x04],
  W: [0x11, 0x11, 0x11, 0x15, 0x15, 0x1b, 0x11],
  X: [0x11, 0x11, 0x0a, 0x04, 0x0a, 0x11, 0x11],
  Y: [0x11, 0x11, 0x0a, 0x04, 0x04, 0x04, 0x04],
  Z: [0x1f, 0x01, 0x02, 0x04, 0x08, 0x10, 0x1f],
  a: [0, 0, 0x0e, 0x01, 0x0f, 0x11, 0x0f],
  b: [0x10, 0x10, 0x1e, 0x11, 0x11, 0x11, 0x1e],
  c: [0, 0, 0x0e, 0x10, 0x10, 0x10, 0x0e],
  d: [0x01, 0x01, 0x0f, 0x11, 0x11, 0x11, 0x0f],
  e: [0, 0, 0x0e, 0x11, 0x1f, 0x10, 0x0e],
  f: [0x06, 0x08, 0x08, 0x1e, 0x08, 0x08, 0x08],
  g: [0, 0, 0x0f, 0x11, 0x0f, 0x01, 0x0e],
  h: [0x10, 0x10, 0x1e, 0x11, 0x11, 0x11, 0x11],
  i: [0x04, 0, 0x0c, 0x04, 0x04, 0x04, 0x0e],
  j: [0x02, 0, 0x06, 0x02, 0x02, 0x12, 0x0c],
  k: [0x10, 0x10, 0x12, 0x14, 0x18, 0x14, 0x12],
  l: [0x0c, 0x04, 0x04, 0x04, 0x04, 0x04, 0x0e],
  m: [0, 0, 0x1a, 0x15, 0x15, 0x11, 0x11],
  n: [0, 0, 0x16, 0x19, 0x11, 0x11, 0x11],
  o: [0, 0, 0x0e, 0x11, 0x11, 0x11, 0x0e],
  p: [0, 0, 0x1e, 0x11, 0x11, 0x1e, 0x10],
  q: [0, 0, 0x0f, 0x11, 0x11, 0x0f, 0x01],
  r: [0, 0, 0x16, 0x19, 0x10, 0x10, 0x10],
  s: [0, 0, 0x0f, 0x10, 0x0e, 0x01, 0x1e],
  t: [0x08, 0x08, 0x1e, 0x08, 0x08, 0x09, 0x06],
  u: [0, 0, 0x11, 0x11, 0x11, 0x13, 0x0d],
  v: [0, 0, 0x11, 0x11, 0x11, 0x0a, 0x04],
  w: [0, 0, 0x11, 0x11, 0x15, 0x15, 0x0a],
  x: [0, 0, 0x11, 0x0a, 0x04, 0x0a, 0x11],
  y: [0, 0, 0x11, 0x11, 0x0f, 0x01, 0x0e],
  z: [0, 0, 0x1f, 0x02, 0x04, 0x08, 0x1f],
};

function drawText(
  rgba: Uint8Array,
  width: number,
  x: number,
  y: number,
  text: string,
  color: [number, number, number],
  scale = 2
) {
  let cx = x;
  for (const ch of text) {
    const glyph = GLYPHS[ch] || GLYPHS[" "];
    if (!glyph) continue;
    for (let row = 0; row < 7; row++) {
      const bits = glyph[row]!;
      for (let col = 0; col < 5; col++) {
        if (bits & (1 << (4 - col))) {
          fillRect(rgba, width, cx + col * scale, y + row * scale, scale, scale, color);
        }
      }
    }
    cx += 6 * scale;
  }
}

function renderPurePng(input: {
  title: string;
  categories: readonly string[];
  series: readonly TrendChartSeries[];
  width: number;
  height: number;
}): Uint8Array {
  const { width, height } = input;
  const rgba = new Uint8Array(width * height * 4);
  // background
  fillRect(rgba, width, 0, 0, width, height, hexToRgb("#FFFFFF"));
  // header band
  fillRect(rgba, width, 0, 0, width, 44, hexToRgb("#0B1F33"));
  drawText(rgba, width, 24, 14, input.title.slice(0, 42), hexToRgb("#F7F1E1"), 2);
  // accent
  fillRect(rgba, width, 0, 44, width, 4, hexToRgb("#B8943F"));

  const pad = { top: 70, right: 36, bottom: 56, left: 72 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;
  const n = input.categories.length;
  const values = input.series[0]?.values ?? [];
  let seriesMax = maxOf(values);
  const yMax = seriesMax > 0 ? seriesMax * 1.15 : 1;

  // plot frame
  fillRect(rgba, width, pad.left, pad.top, plotW, plotH, hexToRgb("#F8FAFC"));
  fillRect(rgba, width, pad.left, pad.top + plotH, plotW, 2, hexToRgb("#0B1F33"));
  fillRect(rgba, width, pad.left, pad.top, 2, plotH, hexToRgb("#0B1F33"));

  const gap = 4;
  const barW = Math.max(6, (plotW - gap * n) / Math.max(n, 1));
  const barColor = hexToRgb("#16324F");
  const topColor = hexToRgb("#B8943F");

  for (let i = 0; i < n; i++) {
    const v = values[i] ?? 0;
    const h = Math.max(2, (v / yMax) * (plotH - 8));
    const x = pad.left + 8 + i * (barW + gap);
    const y = pad.top + plotH - h;
    fillRect(rgba, width, x, y, barW, h, barColor);
    fillRect(rgba, width, x, y, barW, 3, topColor);
  }

  // x labels
  const labelStep = Math.max(1, Math.ceil(n / 10));
  for (let i = 0; i < n; i += labelStep) {
    const label = String(input.categories[i] ?? "").slice(0, 6);
    const x = pad.left + 8 + i * (barW + gap);
    drawText(rgba, width, x, height - 36, label, hexToRgb("#475569"), 1);
  }

  // y max label
  const maxLabel = String(Math.round(seriesMax));
  drawText(rgba, width, 12, pad.top, maxLabel, hexToRgb("#64748B"), 1);

  return encodePngRgba(width, height, rgba);
}

async function renderBrowserPng(input: {
  title: string;
  categories: readonly string[];
  series: readonly TrendChartSeries[];
  width: number;
  height: number;
}): Promise<Uint8Array | null> {
  if (typeof document === "undefined") return null;
  const { width, height } = input;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const pad = { top: 56, right: 32, bottom: 52, left: 64 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;
  const n = input.categories.length;
  if (n === 0) return null;

  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "#0B1F33";
  ctx.fillRect(0, 0, width, 44);
  ctx.fillStyle = "#F7F1E1";
  ctx.font = "bold 16px Calibri, Arial, sans-serif";
  ctx.fillText(input.title, 24, 28);
  ctx.fillStyle = "#B8943F";
  ctx.fillRect(0, 44, width, 4);

  ctx.fillStyle = "#F8FAFC";
  ctx.fillRect(pad.left, pad.top, plotW, plotH);
  ctx.strokeStyle = "#0B1F33";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(pad.left, pad.top);
  ctx.lineTo(pad.left, pad.top + plotH);
  ctx.lineTo(pad.left + plotW, pad.top + plotH);
  ctx.stroke();

  let seriesMax = 0;
  for (const s of input.series) {
    const m = maxOf(s.values);
    if (m > seriesMax) seriesMax = m;
  }
  const yMax = seriesMax > 0 ? seriesMax * 1.15 : 1;
  const values = input.series[0]?.values ?? [];
  const gap = 4;
  const barW = Math.max(6, (plotW - gap * n) / n);

  for (let i = 0; i < n; i++) {
    const h = Math.max(2, ((values[i] ?? 0) / yMax) * (plotH - 8));
    const x = pad.left + 8 + i * (barW + gap);
    const y = pad.top + plotH - h;
    ctx.fillStyle = "#16324F";
    ctx.fillRect(x, y, barW, h);
    ctx.fillStyle = "#B8943F";
    ctx.fillRect(x, y, barW, 3);
  }

  ctx.fillStyle = "#475569";
  ctx.font = "11px Calibri, Arial, sans-serif";
  const labelStep = Math.max(1, Math.ceil(n / 10));
  for (let i = 0; i < n; i += labelStep) {
    const x = pad.left + 8 + i * (barW + gap);
    ctx.fillText(String(input.categories[i] ?? ""), x, height - 22);
  }
  ctx.fillText(String(Math.round(seriesMax)), 10, pad.top + 10);

  const blob: Blob | null = await new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b), "image/png");
  });
  if (!blob) return null;
  return new Uint8Array(await blob.arrayBuffer());
}

/**
 * Renders an executive bar chart PNG for Excel embedding.
 * Always returns bytes when categories exist (browser or Node).
 */
export async function renderTrendChartPng(input: {
  title: string;
  categories: readonly string[];
  series: readonly TrendChartSeries[];
  width?: number;
  height?: number;
}): Promise<Uint8Array | null> {
  if (input.categories.length === 0) return null;
  const width = input.width ?? 1100;
  const height = input.height ?? 420;
  const browser = await renderBrowserPng({ ...input, width, height });
  if (browser) return browser;
  return renderPurePng({ ...input, width, height });
}
