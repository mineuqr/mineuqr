/**
 * FINANCIAL-SHIFT-CLOSING-PRESENTATION-1 — presentation helpers for closing summary.
 * Live difference and report VM only. No Domain / API / Expected Cash changes.
 */

import {
  formatReportingAmount,
  parseReportingAmount,
} from "@shared/reporting-platform";
import {
  formatOpenedAtDisplay,
  parseMoneyAmountInput,
} from "./openingFloatPresentation";
import { presentTenderSummaryRows } from "./financialShiftTenderSummaryPresentation";
import type { RegisterOperationsLang } from "./registerOperationsCopy";

const AUTO_PRINT_KEY = "mineuqr.crmp.autoPrintClosingReport";

export type ShiftClosingReportVm = Readonly<{
  restaurantName: string;
  registerName: string;
  operatorName: string;
  shiftNumber: string;
  openedAtLabel: string;
  closedAtLabel: string;
  durationLabel: string;
  openingFloatAmount: string;
  expectedCashAmount: string;
  actualCashAmount: string;
  differenceAmount: string;
  tenderRows: readonly Readonly<{
    key: string;
    label: string;
    amount: string;
  }>[];
  settlementsCount: number;
  ordersCount: number;
  generatedAtLabel: string;
}>;

/** Domain-aligned variance display: actual − expected (presentation compose). */
export function computeLiveCashDifference(
  expectedCashAmount: string,
  actualRaw: string
): string | null {
  const parsed = parseMoneyAmountInput(actualRaw);
  if (!parsed.ok) return null;
  return formatReportingAmount(
    parseReportingAmount(parsed.amount) -
      parseReportingAmount(expectedCashAmount)
  );
}

export function formatShiftDuration(
  openedAtIso: string,
  closedAtIso: string,
  language: RegisterOperationsLang
): string {
  const opened = new Date(openedAtIso).getTime();
  const closed = new Date(closedAtIso).getTime();
  if (!Number.isFinite(opened) || !Number.isFinite(closed) || closed < opened) {
    return "—";
  }
  const minutes = Math.round((closed - opened) / 60_000);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (language === "ar") {
    if (h <= 0) return `${m} د`;
    return `${h} س ${m} د`;
  }
  if (h <= 0) return `${m}m`;
  return `${h}h ${m}m`;
}

/** @deprecated Prefer human `shiftNumber` from API; UUID suffix is fallback only. */
export function shortenShiftNumber(financialShiftId: string): string {
  const id = financialShiftId.trim();
  if (id.length <= 12) return id;
  return id.slice(-12);
}

export function formatOpsShiftNumber(shiftNumber: number | null | undefined): string {
  if (shiftNumber == null || !Number.isInteger(shiftNumber) || shiftNumber < 1) {
    return "—";
  }
  return String(shiftNumber).padStart(6, "0");
}

export function buildShiftClosingReportVm(input: {
  language: RegisterOperationsLang;
  restaurantName: string;
  registerName: string;
  operatorName: string;
  financialShiftId: string;
  /** Human sequential shift number when available. */
  shiftNumber?: number | null;
  openedAt: string;
  closedAtIso: string;
  openingFloatAmount: string;
  expectedCashAmount: string;
  actualCashAmount: string;
  differenceAmount: string;
  tenderSummary: Readonly<{
    monetaryTenderTotal: string;
    cashTenderTotal: string;
    complimentaryAmount: string;
    refundAmount: string;
    attributedSettlementCount: number;
    methods: readonly Readonly<{
      paymentMethod: string;
      amount: string;
      transactionCount: number;
    }>[];
  }> | null;
  generatedAtIso: string;
}): ShiftClosingReportVm {
  const tenderRows = input.tenderSummary
    ? presentTenderSummaryRows(input.tenderSummary, input.language).map((r) => ({
        key: r.key,
        label: r.label,
        amount: r.amount,
      }))
    : [];

  const settlementsCount = input.tenderSummary?.attributedSettlementCount ?? 0;

  return {
    restaurantName: input.restaurantName.trim() || "—",
    registerName: input.registerName.trim() || "—",
    operatorName: input.operatorName.trim() || "—",
    shiftNumber:
      input.shiftNumber != null
        ? formatOpsShiftNumber(input.shiftNumber)
        : shortenShiftNumber(input.financialShiftId),
    openedAtLabel: formatOpenedAtDisplay(input.openedAt, input.language),
    closedAtLabel: formatOpenedAtDisplay(input.closedAtIso, input.language),
    durationLabel: formatShiftDuration(
      input.openedAt,
      input.closedAtIso,
      input.language
    ),
    openingFloatAmount: input.openingFloatAmount,
    expectedCashAmount: input.expectedCashAmount,
    actualCashAmount: input.actualCashAmount,
    differenceAmount: input.differenceAmount,
    tenderRows,
    settlementsCount,
    /** Without API expansion, settlements ≈ attributed closes (1 Check settle). */
    ordersCount: settlementsCount,
    generatedAtLabel: formatOpenedAtDisplay(
      input.generatedAtIso,
      input.language
    ),
  };
}

export function readAutoPrintClosingReport(): boolean {
  if (typeof localStorage === "undefined") return false;
  return localStorage.getItem(AUTO_PRINT_KEY) === "1";
}

export function writeAutoPrintClosingReport(enabled: boolean): void {
  if (typeof localStorage === "undefined") return;
  if (enabled) localStorage.setItem(AUTO_PRINT_KEY, "1");
  else localStorage.removeItem(AUTO_PRINT_KEY);
}

/**
 * FINANCIAL-SHIFT-CLOSING-PRINT-ISOLATION-1 —
 * Body class scopes @media print isolation to the single closing print root.
 * Does not affect Settlement Receipt or other print surfaces.
 */
export const SHIFT_CLOSING_PRINT_BODY_CLASS = "printing-shift-closing" as const;
export const SHIFT_CLOSING_PRINT_ROOT_ID = "shift-closing-print-root" as const;

/** Browser / thermal / PDF — one pipeline via window.print + isolated root. */
export function printShiftClosingReport(): void {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  const body = document.body;
  body.classList.add(SHIFT_CLOSING_PRINT_BODY_CLASS);

  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    body.classList.remove(SHIFT_CLOSING_PRINT_BODY_CLASS);
    window.removeEventListener("afterprint", cleanup);
  };

  window.addEventListener("afterprint", cleanup);
  window.print();
  // Fallback when afterprint is delayed or skipped.
  window.setTimeout(cleanup, 2_000);
}
