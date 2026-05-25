import type { Worksheet } from "exceljs";
import {
  REPORT_ROW_HEIGHTS,
  REPORT_THEME,
  TABLE_COLUMN_WIDTHS,
  brandFont,
  cellBorder,
  isRtl,
  reportAlignment,
  reportFont,
  restaurantFont,
  solidFill,
  titleFont,
  type ReportLanguage,
} from "./reportTheme";

export const TABLE_COLUMN_COUNT = 3;

export type ReportSheetLayout = {
  brandRow: number;
  restaurantRow: number | null;
  titleRow: number;
  periodRow: number;
  spacerRow: number;
  tableHeaderRow: number;
  dataStartRow: number;
};

export function computeReportLayout(hasRestaurantName: boolean): ReportSheetLayout {
  let row = 1;
  const brandRow = row++;
  const restaurantRow = hasRestaurantName ? row++ : null;
  const titleRow = row++;
  const periodRow = row++;
  const spacerRow = row++;
  const tableHeaderRow = row++;
  const dataStartRow = tableHeaderRow + 1;
  return {
    brandRow,
    restaurantRow,
    titleRow,
    periodRow,
    spacerRow,
    tableHeaderRow,
    dataStartRow,
  };
}

export function mergeRow(
  sheet: Worksheet,
  row: number,
  value: string,
  language: ReportLanguage,
  options: {
    font: Partial<import("exceljs").Font>;
    fill?: ReturnType<typeof solidFill>;
    height?: number;
    align?: "left" | "center" | "right";
    bottomBorder?: boolean;
  }
) {
  sheet.mergeCells(row, 1, row, TABLE_COLUMN_COUNT);
  const cell = sheet.getCell(row, 1);
  cell.value = value;
  cell.font = { name: reportFont(language), ...options.font };
  cell.alignment = reportAlignment(language, options.align ?? "center");
  if (options.fill) cell.fill = options.fill;
  if (options.height) sheet.getRow(row).height = options.height;
  if (options.bottomBorder) {
    cell.border = {
      bottom: { style: "thin", color: { argb: REPORT_THEME.divider } },
    };
  }
}

export function applyBrandingHeader(
  sheet: Worksheet,
  layout: ReportSheetLayout,
  language: ReportLanguage
) {
  mergeRow(sheet, layout.brandRow, "MineuQR", language, {
    font: brandFont(language),
    fill: solidFill(REPORT_THEME.brandBanner),
    height: REPORT_ROW_HEIGHTS.brand,
    align: "center",
  });
}

export function applyRestaurantName(
  sheet: Worksheet,
  layout: ReportSheetLayout,
  language: ReportLanguage,
  restaurantName: string
) {
  if (layout.restaurantRow == null) return;
  mergeRow(sheet, layout.restaurantRow, restaurantName, language, {
    font: restaurantFont(language),
    fill: solidFill(REPORT_THEME.white),
    height: REPORT_ROW_HEIGHTS.restaurant,
    align: "center",
    bottomBorder: true,
  });
}

export function applyReportTitle(
  sheet: Worksheet,
  layout: ReportSheetLayout,
  language: ReportLanguage,
  reportTitle: string
) {
  mergeRow(sheet, layout.titleRow, reportTitle, language, {
    font: titleFont(language),
    fill: solidFill(REPORT_THEME.white),
    height: REPORT_ROW_HEIGHTS.title,
    align: "center",
  });
}

/** Date range + export timestamp in one compact block */
export function applyPeriodBlock(
  sheet: Worksheet,
  layout: ReportSheetLayout,
  language: ReportLanguage,
  reportSubtitle: string,
  metaLine: string
) {
  sheet.mergeCells(layout.periodRow, 1, layout.periodRow, TABLE_COLUMN_COUNT);
  const cell = sheet.getCell(layout.periodRow, 1);

  cell.value = {
    richText: [
      {
        font: { name: reportFont(language), size: 11, color: { argb: REPORT_THEME.subtitle } },
        text: reportSubtitle,
      },
      {
        font: { name: reportFont(language), size: 9, color: { argb: REPORT_THEME.meta } },
        text: `\n${metaLine}`,
      },
    ],
  };
  cell.alignment = reportAlignment(language, "center");
  cell.fill = solidFill(REPORT_THEME.white);
  sheet.getRow(layout.periodRow).height = REPORT_ROW_HEIGHTS.period;
}

export function applyHeaderSpacer(sheet: Worksheet, layout: ReportSheetLayout) {
  sheet.getRow(layout.spacerRow).height = REPORT_ROW_HEIGHTS.spacer;
}

export function cellText(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "object" && value !== null && "richText" in value) {
    return (value as { richText: { text: string }[] }).richText.map((r) => r.text).join("");
  }
  if (typeof value === "object" && value !== null && "result" in value) {
    return String((value as { result?: unknown }).result ?? "");
  }
  if (value instanceof Date) return value.toLocaleString();
  return String(value);
}

export function textDisplayWidth(text: string): number {
  let width = 0;
  for (const ch of text) {
    if (/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/.test(ch)) {
      width += 1.45;
    } else if (/[WMmw@]/.test(ch)) {
      width += 1.2;
    } else {
      width += 1;
    }
  }
  return width;
}

export function applyTableColumnWidths(sheet: Worksheet, layout: ReportSheetLayout, lastRow: number) {
  for (let col = 1; col <= TABLE_COLUMN_COUNT; col++) {
    const minW: number = TABLE_COLUMN_WIDTHS.min[col - 1] ?? 14;
    const maxW: number = TABLE_COLUMN_WIDTHS.max[col - 1] ?? 36;
    let maxUnits = minW;

    for (let row = layout.tableHeaderRow; row <= lastRow; row++) {
      const text = cellText(sheet.getRow(row).getCell(col).value);
      maxUnits = Math.max(maxUnits, textDisplayWidth(text) + 2);
    }

    if (col === 1) {
      const titleText = cellText(sheet.getCell(layout.titleRow, 1).value);
      maxUnits = Math.max(maxUnits, Math.min(textDisplayWidth(titleText) + 2, maxW));
    }

    sheet.getColumn(col).width = Math.min(Math.max(maxUnits, minW), maxW);
  }
}

export function applyWorksheetUx(sheet: Worksheet, language: ReportLanguage, layout: ReportSheetLayout) {
  const rtl = isRtl(language);
  sheet.views = [
    {
      rightToLeft: rtl,
      state: "frozen",
      ySplit: layout.tableHeaderRow,
      activeCell: rtl ? `C${layout.dataStartRow}` : `A${layout.dataStartRow}`,
      showGridLines: true,
      zoomScale: 100,
    },
  ];

  sheet.pageSetup = {
    orientation: "portrait",
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    horizontalCentered: true,
    margins: {
      left: 0.35,
      right: 0.35,
      top: 0.45,
      bottom: 0.45,
      header: 0.15,
      footer: 0.15,
    },
  };

  sheet.headerFooter = {
    oddFooter: rtl ? "MineuQR — &P" : "MineuQR — &P",
  };
}

export function styleTableHeaderCell(
  sheet: Worksheet,
  rowIndex: number,
  colIndex: number,
  text: string,
  language: ReportLanguage
) {
  const cell = sheet.getRow(rowIndex).getCell(colIndex);
  cell.value = text;
  cell.font = {
    name: reportFont(language),
    size: 11,
    bold: true,
    color: { argb: REPORT_THEME.headerText },
  };
  cell.fill = solidFill(REPORT_THEME.headerBg);
  cell.alignment = reportAlignment(language, "center", 0);
  cell.border = cellBorder(REPORT_THEME.brandDeep);
}
