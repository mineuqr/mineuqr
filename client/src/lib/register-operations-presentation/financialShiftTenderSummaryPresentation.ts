/**
 * FINANCIAL-SHIFT-SUMMARIES-ADOPTION-1 /
 * FINANCIAL-SHIFT-TENDER-PRESENTATION-REFINEMENT-1 —
 * presentation mapping for Register Operations tender summary.
 *
 * Groups electronic methods for Ops display only.
 * Does not change API DTO, Settlement, Reporting, or Expected Cash.
 */

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

/** Electronic / bank tenders rolled into Ops “شبكة / بنك”. */
export const OPS_NETWORK_BANK_METHODS = [
  "mada",
  "visa",
  "mastercard",
  "apple_pay",
  "stc_pay",
  "bank_transfer",
  "other",
] as const;

function sumDisplayAmounts(amounts: readonly string[]): string {
  let total = 0;
  for (const amount of amounts) {
    total += parseReportingAmount(amount);
  }
  return formatReportingAmount(total);
}

/** Build operational rows from certified tender summary DTO. */
export function presentTenderSummaryRows(
  summary: TenderSummaryDto,
  language: RegisterOperationsLang
): readonly TenderSummaryRowVm[] {
  const byMethod = new Map(
    summary.methods.map((m) => [m.paymentMethod, m.amount] as const)
  );

  const networkBankAmount = sumDisplayAmounts(
    OPS_NETWORK_BANK_METHODS.map((method) => byMethod.get(method) ?? "0.00")
  );

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
      key: "network_bank",
      label: registerOperationsUiLabel("tenderNetworkBank", language),
      amount: networkBankAmount,
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
