/**
 * FINANCIAL-SHIFT-SUMMARIES-ADOPTION-1 — presentation mapping for tender summary.
 * No amount calculation — maps API DTO fields to display rows only.
 */

import { preferredPaymentMethodLabel } from "@shared/reporting-platform";
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

const METHOD_ORDER = [
  "cash",
  "mada",
  "visa",
  "mastercard",
  "apple_pay",
  "stc_pay",
  "bank_transfer",
  "other",
] as const;

/** Build display rows from certified tender summary DTO (no math). */
export function presentTenderSummaryRows(
  summary: TenderSummaryDto,
  language: RegisterOperationsLang
): readonly TenderSummaryRowVm[] {
  const lang = language === "ar" ? "ar" : "en";
  const byMethod = new Map(
    summary.methods.map((m) => [m.paymentMethod, m.amount] as const)
  );

  const rows: TenderSummaryRowVm[] = [
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
  ];

  for (const method of METHOD_ORDER) {
    if (method === "cash") continue;
    rows.push({
      key: method,
      label: preferredPaymentMethodLabel(method, lang),
      amount: byMethod.get(method) ?? "0.00",
    });
  }

  rows.push({
    key: "complimentary",
    label: registerOperationsUiLabel("tenderComplimentary", language),
    amount: summary.complimentaryAmount,
  });
  rows.push({
    key: "refund",
    label: registerOperationsUiLabel("tenderRefund", language),
    amount: summary.refundAmount,
  });

  return rows;
}
