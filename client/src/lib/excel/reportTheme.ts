import type { Alignment, Border, Borders, Fill, Font } from "exceljs";

/** MineuQR SaaS report palette (ARGB) */
export const REPORT_THEME = {
  brand: "FF0D9488",
  brandDark: "FF0F766E",
  brandDeep: "FF0B3B45",
  brandLight: "FFCCFBF1",
  brandBanner: "FFF0FDFA",
  title: "FF0F172A",
  restaurant: "FF334155",
  subtitle: "FF64748B",
  meta: "FF94A3B8",
  headerBg: "FF0B3B45",
  headerText: "FFFFFFFF",
  bodyText: "FF1E293B",
  zebra: "FFF8FAFC",
  totalsBg: "FF0F766E",
  totalsText: "FFFFFFFF",
  border: "FFCBD5E1",
  borderLight: "FFE2E8F0",
  divider: "FFE2E8F0",
  white: "FFFFFFFF",
} as const;

/** Compact row heights (points) */
export const REPORT_ROW_HEIGHTS = {
  brand: 18,
  restaurant: 20,
  title: 30,
  period: 20,
  spacer: 6,
  tableHeader: 26,
  data: 22,
  totals: 28,
} as const;

/** Minimum column widths for a full-width table feel */
export const TABLE_COLUMN_WIDTHS = {
  min: [30, 18, 24] as const,
  max: [54, 28, 36] as const,
};

export type ReportLanguage = "ar" | "en";

export type CurrencyFormatConfig = {
  symbol: string;
  code?: string;
  decimalPlaces?: number;
};

export function isRtl(language: ReportLanguage): boolean {
  return language === "ar";
}

export function reportFont(language: ReportLanguage): string {
  return language === "ar" ? "Arial" : "Calibri";
}

export function solidFill(argb: string): Fill {
  return { type: "pattern", pattern: "solid", fgColor: { argb } };
}

function borderEdge(color: string, style: Border["style"] = "thin"): Border {
  return { style, color: { argb: color } };
}

export function cellBorder(color: string = REPORT_THEME.border): Partial<Borders> {
  const edge = borderEdge(color);
  return { top: edge, left: edge, bottom: edge, right: edge };
}

export function totalsRowBorder(): Partial<Borders> {
  return {
    top: borderEdge(REPORT_THEME.brand, "double"),
    left: borderEdge(REPORT_THEME.brandDark, "thin"),
    bottom: borderEdge(REPORT_THEME.brandDark, "medium"),
    right: borderEdge(REPORT_THEME.brandDark, "thin"),
  };
}

export function reportAlignment(
  language: ReportLanguage,
  horizontal: "left" | "center" | "right" = "center",
  indent = 0
): Partial<Alignment> {
  const rtl = isRtl(language);
  const resolved =
    horizontal === "center"
      ? "center"
      : horizontal === "right"
        ? "right"
        : rtl
          ? "right"
          : "left";

  return {
    horizontal: resolved,
    vertical: "middle",
    wrapText: horizontal === "center",
    readingOrder: rtl ? "rtl" : "ltr",
    shrinkToFit: false,
    indent,
  };
}

export function brandFont(language: ReportLanguage): Partial<Font> {
  return {
    name: reportFont(language),
    size: 9,
    bold: true,
    color: { argb: REPORT_THEME.brandDark },
  };
}

export function restaurantFont(language: ReportLanguage): Partial<Font> {
  return {
    name: reportFont(language),
    size: 12,
    bold: true,
    color: { argb: REPORT_THEME.restaurant },
  };
}

export function titleFont(language: ReportLanguage): Partial<Font> {
  return {
    name: reportFont(language),
    size: 24,
    bold: true,
    color: { argb: REPORT_THEME.title },
  };
}

export function periodFont(language: ReportLanguage): Partial<Font> {
  return {
    name: reportFont(language),
    size: 11,
    color: { argb: REPORT_THEME.subtitle },
  };
}

export function metaFont(language: ReportLanguage): Partial<Font> {
  return {
    name: reportFont(language),
    size: 9,
    color: { argb: REPORT_THEME.meta },
  };
}

export function headerFont(language: ReportLanguage): Partial<Font> {
  return {
    name: reportFont(language),
    size: 11,
    bold: true,
    color: { argb: REPORT_THEME.headerText },
  };
}

export function bodyFont(language: ReportLanguage, bold = false): Partial<Font> {
  return {
    name: reportFont(language),
    size: 11,
    bold,
    color: { argb: bold ? REPORT_THEME.totalsText : REPORT_THEME.bodyText },
  };
}

export function totalsFont(language: ReportLanguage): Partial<Font> {
  return {
    name: reportFont(language),
    size: 12,
    bold: true,
    color: { argb: REPORT_THEME.totalsText },
  };
}

export function currencyNumFmt(config: CurrencyFormatConfig): string {
  const decimals = Math.max(0, config.decimalPlaces ?? 2);
  const decimalPart = decimals > 0 ? `.${"0".repeat(decimals)}` : "";
  const base = `#,##0${decimalPart}`;
  const code = (config.code ?? "").toUpperCase();
  const symbol = config.symbol.trim();

  if (code === "SAR" || symbol === "ر.س" || symbol === "SAR" || symbol === "ر.س.") {
    return `${base} "ر.س"`;
  }
  if (code === "USD" || symbol === "$") {
    return `"$"${base}`;
  }
  if (code === "EUR" || symbol === "€") {
    return `${base} "€"`;
  }
  if (code === "AED") {
    return `${base} "د.إ"`;
  }

  const escaped = symbol.replace(/"/g, '""');
  if (!escaped) return base;
  if (/[\u0600-\u06FF]/.test(symbol)) {
    return `${base} "${escaped}"`;
  }
  return `${base} "${escaped}"`;
}

export function currencyNumFmtFromSymbol(symbol: string): string {
  return currencyNumFmt({ symbol });
}
