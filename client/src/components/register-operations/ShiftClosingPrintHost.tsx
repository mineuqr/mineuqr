/**
 * FINANCIAL-SHIFT-CLOSING-PRINT-ISOLATION-1 — single print root for closing reports.
 * Exactly one mount. Screen-hidden; visible only under scoped @media print.
 */

import { createPortal } from "react-dom";
import { ShiftClosingPrintReport } from "./ShiftClosingPrintReport";
import {
  SHIFT_CLOSING_PRINT_ROOT_ID,
  type RegisterOperationsLang,
  type ShiftClosingReportVm,
} from "@/lib/register-operations-presentation";

type Props = {
  language: RegisterOperationsLang;
  currencySymbol: string;
  report: ShiftClosingReportVm | null;
};

export function ShiftClosingPrintHost({
  language,
  currencySymbol,
  report,
}: Props) {
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      id={SHIFT_CLOSING_PRINT_ROOT_ID}
      data-shift-closing-print-root="true"
      aria-hidden={report ? undefined : true}
      className="pointer-events-none fixed start-0 top-0 -z-10 h-px w-px overflow-hidden opacity-0"
    >
      {report ? (
        <ShiftClosingPrintReport
          language={language}
          currencySymbol={currencySymbol}
          report={report}
        />
      ) : null}
    </div>,
    document.body
  );
}
