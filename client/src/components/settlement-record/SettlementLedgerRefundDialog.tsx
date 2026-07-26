/**
 * REFUND-OPERATIONAL-WORKFLOW-ADOPTION-2
 * Settlement Ledger → مرتجع operational workflow (Settlement Number lookup).
 * Presentation only — domain money via checkRefund façade.
 */

import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  checkRefundErrorMessage,
  formatElapsedRefundWindow,
  mapCheckRefundApiError,
  settlementRecordUiLabel,
  useApplyCheckRefund,
  useLookupCheckRefundBySettlementNumber,
  type SettlementRecordLang,
} from "@/lib/settlement-record-presentation";
import { listMonetaryPaymentMethodOptions } from "@/lib/settlementPaymentMethodPresentation";
import { readActiveRegister } from "@/lib/register-operations-presentation";
import { cn } from "@/lib/utils";
import type { SelectablePaymentMethod } from "@shared/operational-session";
import { Loader2 } from "lucide-react";

type SettlementLedgerRefundDialogProps = {
  open: boolean;
  restaurantId: number;
  language: SettlementRecordLang;
  onOpenChange: (open: boolean) => void;
  onPublished?: (settlementRecordId: string | null) => void;
  onSaveAndPrint?: (settlementRecordId: string | null) => void;
};

type Mode = "full" | "partial";

function SummaryRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-end font-medium tabular-nums text-foreground">
        {value}
      </span>
    </div>
  );
}

export function SettlementLedgerRefundDialog({
  open,
  restaurantId,
  language,
  onOpenChange,
  onPublished,
  onSaveAndPrint,
}: SettlementLedgerRefundDialogProps) {
  const [settlementNumber, setSettlementNumber] = useState("");
  const [lookupKey, setLookupKey] = useState("");
  const [mode, setMode] = useState<Mode>("full");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [tender, setTender] = useState<SelectablePaymentMethod | null>(null);
  const [managerApproved, setManagerApproved] = useState(false);
  const [printAfter, setPrintAfter] = useState(false);

  const lookup = useLookupCheckRefundBySettlementNumber(
    { restaurantId, settlementNumber: lookupKey },
    { enabled: open && lookupKey.trim().length > 0 }
  );
  const apply = useApplyCheckRefund();
  const options = listMonetaryPaymentMethodOptions(language);
  const data = lookup.data;
  const sym = data?.currencySymbol ?? "";

  useEffect(() => {
    if (!open) {
      setSettlementNumber("");
      setLookupKey("");
      setMode("full");
      setAmount("");
      setReason("");
      setTender(null);
      setManagerApproved(false);
      setPrintAfter(false);
      apply.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset on close only
  }, [open]);

  useEffect(() => {
    if (data?.refundableBalance) {
      setAmount(data.refundableBalance);
      setMode("full");
    }
  }, [data?.settlementRecordId, data?.refundableBalance]);

  const windowExpired = data?.window.expired === true;
  const policyBlocked =
    data?.rejectionCode === "REFUND_POLICY_DISABLED" ||
    data?.rejectionCode === "NOT_PAID" ||
    data?.rejectionCode === "NOT_ELIGIBLE";
  const canSave =
    !!data &&
    data.eligible &&
    !windowExpired &&
    !policyBlocked &&
    !!tender &&
    (!data.policy.requireReason || reason.trim().length > 0) &&
    (!data.policy.requireManagerApproval || managerApproved) &&
    !apply.isPending;

  const errorMessage = useMemo(() => {
    if (lookup.error) {
      const kind = mapCheckRefundApiError(lookup.error);
      if (
        String((lookup.error as { message?: string }).message ?? "")
          .toLowerCase()
          .includes("unknown")
      ) {
        return settlementRecordUiLabel("refundErrorUnknownSettlement", language);
      }
      return checkRefundErrorMessage(kind, language);
    }
    if (apply.error) {
      return checkRefundErrorMessage(
        mapCheckRefundApiError(apply.error),
        language
      );
    }
    return null;
  }, [lookup.error, apply.error, language]);

  const runLookup = () => {
    apply.reset();
    setLookupKey(settlementNumber.trim());
  };

  const submit = (andPrint: boolean) => {
    if (!data || !tender || !canSave) return;
    setPrintAfter(andPrint);
    const registerId = readActiveRegister(restaurantId);
    const submitAmount =
      mode === "full" ? data.refundableBalance : amount.trim();
    apply.mutate(
      {
        restaurantId,
        checkId: data.checkId,
        amount: submitAmount,
        tenderMethod: tender,
        reason: reason.trim() || null,
        managerApproved: data.policy.requireManagerApproval
          ? managerApproved
          : undefined,
        ...(registerId ? { registerId } : {}),
      },
      {
        onSuccess: (result) => {
          onOpenChange(false);
          onPublished?.(result.settlementRecordId);
          if (andPrint) {
            onSaveAndPrint?.(result.settlementRecordId);
          }
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[90vh] max-w-lg overflow-y-auto sm:max-w-xl"
        dir={language === "ar" ? "rtl" : "ltr"}
      >
        <DialogHeader>
          <DialogTitle>
            {settlementRecordUiLabel("ledgerRefundTitle", language)}
          </DialogTitle>
          <DialogDescription>
            {settlementRecordUiLabel("ledgerRefundBody", language)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="space-y-2">
            <label
              className="text-xs font-medium text-muted-foreground"
              htmlFor="ledger-refund-settlement-number"
            >
              {settlementRecordUiLabel("settlementNumber", language)}
            </label>
            <div className="flex gap-2">
              <Input
                id="ledger-refund-settlement-number"
                value={settlementNumber}
                onChange={(e) => setSettlementNumber(e.target.value)}
                placeholder="ST-000570004"
                autoComplete="off"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    runLookup();
                  }
                }}
              />
              <Button
                type="button"
                variant="secondary"
                onClick={runLookup}
                disabled={!settlementNumber.trim() || lookup.isFetching}
              >
                {lookup.isFetching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  settlementRecordUiLabel("refundLookupAction", language)
                )}
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {settlementRecordUiLabel("refundLookupHint", language)}
            </p>
          </div>

          {errorMessage ? (
            <p className="text-sm text-destructive" role="alert">
              {errorMessage}
            </p>
          ) : null}

          {data ? (
            <div className="space-y-3 rounded-lg border border-border/60 bg-muted/20 px-4 py-3">
              <SummaryRow
                label={settlementRecordUiLabel("settlementNumber", language)}
                value={data.settlementNumber}
              />
              <SummaryRow
                label={settlementRecordUiLabel("checkSource", language)}
                value={`#${data.checkId}`}
              />
              <SummaryRow
                label={settlementRecordUiLabel("businessDay", language)}
                value={data.businessDay}
              />
              <SummaryRow
                label={settlementRecordUiLabel("settledAt", language)}
                value={data.settledAt ?? "—"}
              />
              <SummaryRow
                label={settlementRecordUiLabel("paymentMethodSummary", language)}
                value={data.paymentMethodSummary}
              />
              <SummaryRow
                label={settlementRecordUiLabel("refundOriginalAmount", language)}
                value={`${sym}${data.originalAmount}`}
              />
              <SummaryRow
                label={settlementRecordUiLabel("refundPreviouslyRefunded", language)}
                value={`${sym}${data.previouslyRefunded}`}
              />
              <SummaryRow
                label={settlementRecordUiLabel("refundableBalance", language)}
                value={`${sym}${data.refundableBalance}`}
              />
            </div>
          ) : null}

          {data && windowExpired ? (
            <div
              className="space-y-1 rounded-lg border border-amber-500/40 bg-amber-950/30 px-4 py-3 text-sm text-amber-100"
              role="status"
            >
              <p className="font-medium">
                {settlementRecordUiLabel("refundWindowExpiredTitle", language)}
              </p>
              <p>
                {settlementRecordUiLabel("settledAt", language)}:{" "}
                {data.window.settlementAt}
              </p>
              <p>
                {settlementRecordUiLabel("refundWindowAllowed", language)}:{" "}
                {data.window.windowHours}{" "}
                {settlementRecordUiLabel("refundWindowHours", language)}
              </p>
              <p>
                {settlementRecordUiLabel("refundWindowElapsed", language)}:{" "}
                {formatElapsedRefundWindow(data.window.elapsedMs, language)}
              </p>
            </div>
          ) : null}

          {data && !windowExpired && data.eligible ? (
            <>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={mode === "full" ? "default" : "outline"}
                  onClick={() => {
                    setMode("full");
                    setAmount(data.refundableBalance);
                  }}
                >
                  {settlementRecordUiLabel("refundFull", language)}
                </Button>
                {data.policy.partialRefundAllowed ? (
                  <Button
                    type="button"
                    size="sm"
                    variant={mode === "partial" ? "default" : "outline"}
                    onClick={() => setMode("partial")}
                  >
                    {settlementRecordUiLabel("refundPartial", language)}
                  </Button>
                ) : null}
              </div>

              <div className="space-y-1">
                <label
                  className="text-xs font-medium text-muted-foreground"
                  htmlFor="ledger-refund-amount"
                >
                  {settlementRecordUiLabel("refundAmount", language)}
                </label>
                <Input
                  id="ledger-refund-amount"
                  value={mode === "full" ? data.refundableBalance : amount}
                  onChange={(e) => setAmount(e.target.value)}
                  disabled={mode === "full"}
                  inputMode="decimal"
                />
              </div>

              <div className="space-y-1">
                <label
                  className="text-xs font-medium text-muted-foreground"
                  htmlFor="ledger-refund-reason"
                >
                  {data.policy.requireReason
                    ? settlementRecordUiLabel("refundReasonRequired", language)
                    : settlementRecordUiLabel("refundReason", language)}
                </label>
                <Input
                  id="ledger-refund-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">
                  {settlementRecordUiLabel("refundTender", language)}
                </p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {options.map((opt) => (
                    <button
                      key={opt.paymentMethod}
                      type="button"
                      className={cn(
                        "rounded-md border px-2 py-2 text-sm transition-colors",
                        tender === opt.paymentMethod
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-muted-foreground/40"
                      )}
                      onClick={() => setTender(opt.paymentMethod)}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {data.policy.requireManagerApproval ? (
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={managerApproved}
                    onChange={(e) => setManagerApproved(e.target.checked)}
                  />
                  {settlementRecordUiLabel("refundManagerApproval", language)}
                </label>
              ) : null}
            </>
          ) : null}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            {settlementRecordUiLabel("cancel", language)}
          </Button>
          {!windowExpired && data?.eligible ? (
            <>
              <Button
                type="button"
                variant="secondary"
                disabled={!canSave}
                onClick={() => submit(false)}
              >
                {apply.isPending && !printAfter ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  settlementRecordUiLabel("refundSave", language)
                )}
              </Button>
              <Button
                type="button"
                disabled={!canSave}
                onClick={() => submit(true)}
              >
                {apply.isPending && printAfter ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  settlementRecordUiLabel("refundSaveAndPrint", language)
                )}
              </Button>
            </>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
