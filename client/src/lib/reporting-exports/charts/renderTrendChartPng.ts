/**
 * REPORTING-EXPORT-TEMPLATES-1 — static chart image from Reporting DTO series.
 * Presentation scaling only — does not invent KPI values.
 */

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

/**
 * Renders a simple line/bar chart PNG for Excel embedding.
 * Returns null when Canvas is unavailable (e.g. some test runtimes).
 */
export async function renderTrendChartPng(input: {
  title: string;
  categories: readonly string[];
  series: readonly TrendChartSeries[];
  width?: number;
  height?: number;
}): Promise<Uint8Array | null> {
  if (typeof document === "undefined") return null;
  const width = input.width ?? 720;
  const height = input.height ?? 320;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const pad = { top: 36, right: 24, bottom: 48, left: 56 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;
  const n = input.categories.length;
  if (n === 0) return null;

  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "#0F172A";
  ctx.font = "bold 14px Calibri, Arial, sans-serif";
  ctx.fillText(input.title, pad.left, 22);

  ctx.strokeStyle = "#E2E8F0";
  ctx.lineWidth = 1;
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
  const yMax = seriesMax > 0 ? seriesMax * 1.1 : 1;

  const colors = ["#0B1F33", "#B8943F", "#16324F"];
  const pointCount = Math.max(n, 1);

  input.series.forEach((s, seriesIndex) => {
    const color = colors[seriesIndex % colors.length]!;
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < s.values.length; i++) {
      const x = pad.left + (pointCount === 1 ? plotW / 2 : (i / (pointCount - 1)) * plotW);
      const y = pad.top + plotH - (s.values[i]! / yMax) * plotH;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    for (let i = 0; i < s.values.length; i++) {
      const x = pad.left + (pointCount === 1 ? plotW / 2 : (i / (pointCount - 1)) * plotW);
      const y = pad.top + plotH - (s.values[i]! / yMax) * plotH;
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  ctx.fillStyle = "#64748B";
  ctx.font = "10px Calibri, Arial, sans-serif";
  const labelStep = Math.max(1, Math.ceil(n / 8));
  for (let i = 0; i < n; i += labelStep) {
    const x = pad.left + (pointCount === 1 ? plotW / 2 : (i / (pointCount - 1)) * plotW);
    const label = input.categories[i] ?? "";
    ctx.fillText(label.slice(-5), x - 14, height - 18);
  }

  const blob: Blob | null = await new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b), "image/png");
  });
  if (!blob) return null;
  return new Uint8Array(await blob.arrayBuffer());
}
