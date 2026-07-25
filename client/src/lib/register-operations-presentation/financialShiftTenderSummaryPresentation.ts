/**
 * FINANCIAL-SHIFT-SUMMARIES-ADOPTION-1 /
 * FINANCIAL-SHIFT-TENDER-PRESENTATION-REFINEMENT-1 /
 * PAYMENT-METHOD-CATALOG-UNIFICATION-1 —
 * presentation mapping for Register Operations tender summary.
 *
 * Groups electronic / legacy brand methods under canonical `card`.
 * Does not change API DTO, Settlement, Reporting, or Expected Cash.
 */

import { toCanonicalPaymentMethod } from "@shared/operational-session";
import {
  formatReportingAmount,
  parseReportingAmount,
} from "@shared/reporting-platform";
import {
  registerOperationsUiLabel,
  type RegisterOperationsLang,
} from "./registerOperationsCopy";

export type TenderSummaryRowVm = Readonly<{
  key: string;
  label: string;
  amount: string;
  emphasize?: boolean;
}>;

type TenderSummaryDto = Readonly<{
  monetaryTenderTotal: string;
  cashTenderTotal: string;
  complimentaryAmount: string;
  refundAmount: string;
  methods: readonly Readonly<{
    paymentMethod: string;
    amount: string;
    transactionCount: number;
  }>[];
}>;

/**
 * Ops non-cash row: canonical card + reserved other (prior Ops rolled
 * electronic brands and other into one network/bank line).
 */
function sumOpsCardTenders(
  methods: TenderSummaryDto["methods"]
): string {
  let total = 0;
  for (const row of methods) {
    const canonical = toCanonicalPaymentMethod(row.paymentMethod);
    if (canonical === "card" || canonical === "other") {
      total += parseReportingAmount(row.amount);
    }
  }
  return formatReportingAmount(total);
}

/** Build operational rows from certified tender summary DTO. */
export function presentTenderSummaryRows(
  summary: TenderSummaryDto,
  language: RegisterOperationsLang
): readonly TenderSummaryRowVm[] {
  return [
    {
      key: "total",
      label: registerOperationsUiLabel("totalSalesTenders", language),
      amount: summary.monetaryTenderTotal,
      emphasize: true,
    },
    {
      key: "cash",
      label: registerOperationsUiLabel("cashSales", language),
      amount: summary.cashTenderTotal,
    },
    {
      key: "card",
      label: registerOperationsUiLabel("tenderNetworkBank", language),
      amount: sumOpsCardTenders(summary.methods),
    },
    {
      key: "complimentary",
      label: registerOperationsUiLabel("tenderComplimentary", language),
      amount: summary.complimentaryAmount,
    },
    {
      key: "refund",
      label: registerOperationsUiLabel("tenderRefund", language),
      amount: summary.refundAmount,
    },
  ];
}
