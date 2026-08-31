/**
 * SAUDI-TAX-INVOICE-CASHIER-UX-1
 * SAUDI-TAX-INVOICE-CASHIER-DOCUMENT-UNIFICATION-1 — primary customer-facing dialog.
 * View/Print dialog for persisted Phase 1 Saudi Tax Invoice.
 * Does not generate Tax Invoice. Does not recalculate VAT.
 */

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  cashierUiLabel,
  type CashierLang,
} from "@/lib/cashier-workspace/cashierCopy";
import {
  CASHIER_SAUDI_TAX_INVOICE_PRINT_ROOT_ID,
  printCashierSaudiTaxInvoice,
  type CashierSaudiTaxInvoiceViewModel,
} from "@/lib/cashier-workspace/saudiTaxInvoiceCashierView";
import { formatCashierReceiptDateTime } from "@/lib/cashier-workspace/cashierPaidReceipt";
import { QRCodeSVG } from "qrcode.react";
import { Printer } from "lucide-react";

export type CashierSaudiTaxInvoiceAvailability =
  | "loading"
  | "ready"
  | "unavailable"
  | "blocked_profile"
  | "failed"
  | "retryable";

type Props = {
  open: boolean;
  language: CashierLang;
  view: CashierSaudiTaxInvoiceViewModel | null;
  availability: CashierSaudiTaxInvoiceAvailability;
  /** Financial success banner — not a second invoice document. */
  paymentSuccess?: {
    amountLabel: string;
    referenceLabel: string;
  } | null;
  onOpenChange: (open: boolean) => void;
};

export function CashierSaudiTaxInvoiceDialog({
  open,
  language,
  view,
  availability,
  paymentSuccess,
  onOpenChange,
}: Props) {
  const t = (key: Parameters<typeof cashierUiLabel>[0]) =>
    cashierUiLabel(key, language);
  const dir = language === "ar" ? "rtl" : "ltr";
  const when = view
    ? formatCashierReceiptDateTime(view.issueTimestampIso, language)
    : { date: "", time: "" };
  const title = language === "ar" ? view?.titleAr : view?.titleEn;
  const buyer =
    language === "ar" ? view?.buyerLabelAr : view?.buyerLabelEn;
  const ready = availability === "ready" && view != null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        dir={dir}
        showCloseButton
        className="flex max-h-[90dvh] max-w-md flex-col overflow-hidden border-[#e5e7eb] bg-white text-[#111827] shadow-lg print:static print:top-auto print:left-auto print:h-auto print:max-h-none print:max-w-none print:translate-none print:overflow-visible print:border-0 print:bg-white print:shadow-none"
      >
        <DialogHeader className="shrink-0 print:hidden">
          <DialogTitle className="text-[#111827]">
            {ready
              ? (title ?? t("taxInvoiceTitle"))
              : t("taxInvoiceTitle")}
          </DialogTitle>
        </DialogHeader>

        {paymentSuccess ? (
          <div className="shrink-0 space-y-1 border-b border-[#e5e7eb] pb-3 print:hidden">
            <p className="text-base font-semibold text-[#111827]">
              ✓ {t("paidSuccess")}
            </p>
            <p className="text-2xl font-bold tabular-nums text-[#111827]">
              {paymentSuccess.amountLabel}
            </p>
            {paymentSuccess.referenceLabel ? (
              <p className="text-sm text-[#6b7280]">
                {paymentSuccess.referenceLabel}
              </p>
            ) : null}
          </div>
        ) : null}

        {!ready ? (
          <div className="shrink-0 space-y-2 py-2 print:hidden">
            {availability === "loading" ? (
              <p className="text-sm text-[#6b7280]">{t("taxInvoicePreparing")}</p>
            ) : null}
            {availability === "unavailable" ||
            availability === "failed" ||
            availability === "retryable" ? (
              <p className="text-sm text-[#6b7280]">{t("taxInvoiceUnavailable")}</p>
            ) : null}
            {availability === "blocked_profile" ? (
              <p className="text-sm text-[#6b7280]">
                {t("taxInvoiceBlockedProfile")}
              </p>
            ) : null}
          </div>
        ) : null}

        {ready && view ? (
          <div
            id={CASHIER_SAUDI_TAX_INVOICE_PRINT_ROOT_ID}
            className="cashier-saudi-tax-invoice-document min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain bg-white p-1 text-sm text-[#111827] print:h-auto print:max-h-none print:flex-none print:overflow-visible print:bg-white"
          >
            <div className="space-y-1 text-center">
              <p className="text-lg font-extrabold leading-tight">{title}</p>
              <p>
                {t("taxInvoiceNumber")}: {view.invoiceNumber}
              </p>
              <p>
                {t("receiptDate")}: {when.date}
              </p>
              <p>
                {t("receiptTime")}: {when.time}
              </p>
            </div>

            <div className="space-y-1 border-t border-[#111827] pt-2">
              <p>
                <strong>{t("taxInvoiceSeller")}:</strong> {view.sellerLegalName}
              </p>
              <p>
                <strong>{t("taxInvoiceSellerVat")}:</strong>{" "}
                {view.sellerVatNumber || "—"}
              </p>
              {view.sellerAddress ? (
                <p>
                  <strong>{t("taxInvoiceSellerAddress")}:</strong>{" "}
                  {view.sellerAddress}
                </p>
              ) : null}
              <p>
                <strong>{t("taxInvoiceBuyer")}:</strong> {buyer}
              </p>
              {view.buyerVatNumber ? (
                <p>
                  <strong>{t("taxInvoiceBuyerVat")}:</strong>{" "}
                  {view.buyerVatNumber}
                </p>
              ) : null}
            </div>

            <table className="cashier-saudi-tax-invoice-lines w-full table-fixed border-collapse text-xs">
              <colgroup>
                <col className="cashier-sti-col-product" />
                <col className="cashier-sti-col-qty" />
                <col className="cashier-sti-col-unit" />
                <col className="cashier-sti-col-total" />
              </colgroup>
              <thead>
                <tr className="border-b border-[#111827]">
                  <th className="pb-1 text-start font-semibold">
                    {t("receiptItems")}
                  </th>
                  <th className="pb-1 text-end font-semibold whitespace-nowrap">
                    {t("receiptQty")}
                  </th>
                  <th className="pb-1 text-end font-semibold whitespace-nowrap">
                    {t("receiptUnitPrice")}
                  </th>
                  <th className="pb-1 text-end font-semibold whitespace-nowrap">
                    {t("ticketTotal")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {view.lines.map((line, idx) => {
                  const name =
                    language === "ar"
                      ? line.nameAr || line.nameEn
                      : line.nameEn || line.nameAr;
                  return (
                    <tr key={`${view.taxInvoiceId}-${idx}`} className="align-top">
                      <td className="cashier-sti-product py-0.5 pe-1 text-start text-sm font-medium leading-tight">
                        {name}
                      </td>
                      <td className="py-0.5 text-end whitespace-nowrap tabular-nums">
                        {line.quantity}
                      </td>
                      <td className="py-0.5 text-end whitespace-nowrap tabular-nums">
                        {line.unitPrice}
                      </td>
                      <td className="py-0.5 text-end whitespace-nowrap tabular-nums">
                        {line.lineAmount}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div className="space-y-1 border-t border-[#111827] pt-2">
              <div className="flex justify-between gap-2">
                <span>{t("ticketSubtotal")}</span>
                <span className="tabular-nums">
                  {view.subtotal} {view.currencyCode}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span>{t("ticketDiscount")}</span>
                <span className="tabular-nums">
                  {view.discountAmount} {view.currencyCode}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span>{t("receiptVat")}</span>
                <span className="tabular-nums">
                  {view.taxAmount} {view.currencyCode}
                </span>
              </div>
              <div className="flex justify-between gap-2 border-t border-[#111827] pt-1 text-base font-semibold">
                <span>{t("ticketTotal")}</span>
                <span className="tabular-nums">
                  {view.amount} {view.currencyCode}
                </span>
              </div>
            </div>

            {view.qrRequired && view.qrPayloadBase64 ? (
              <div className="flex flex-col items-center gap-2 border-t border-[#111827] pt-3">
                <p className="text-xs font-semibold">{t("taxInvoiceQr")}</p>
                <QRCodeSVG
                  value={view.qrPayloadBase64}
                  size={160}
                  level="M"
                  includeMargin={false}
                  bgColor="#ffffff"
                  fgColor="#111827"
                />
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="flex shrink-0 gap-2 print:hidden">
          <Button
            type="button"
            className="flex-1"
            disabled={!ready}
            onClick={() => printCashierSaudiTaxInvoice()}
          >
            <Printer className="me-2 h-4 w-4" />
            {t("taxInvoicePrint")}
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="flex-1"
            onClick={() => onOpenChange(false)}
          >
            {t("receiptClose")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
