/**
 * SELF-ORDERING-SETTLEMENT-ADOPTION-1 — Kiosk checkout + Register Payment.
 *
 * Flow: Place Order → Register Payment → Settlement Success → Receipt / tracking
 * Reuses certified order.settlePaid → settleCheckPaidByIdDetailed pipeline.
 */

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Loader2, Printer } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  buildKioskStationCheckoutIdentity,
  useOrderingCart,
  useOrderingCheckout,
  useOrderingClientRuntime,
} from "@/lib/ordering-client";
import { kioskCustomerFacingLabel } from "@/lib/ordering-client/kiosk/kioskPresentationLabels";
import {
  computeRemainingDisplay,
  settlementRecordUiLabel,
} from "@/lib/settlement-record-presentation";
import {
  listMonetaryPaymentMethodOptions,
  singleTenderSettlements,
} from "@/lib/settlementPaymentMethodPresentation";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import type { MonetaryPaymentMethod } from "@shared/operational-session";
import type { CheckoutPlaceOrderResult } from "@/lib/ordering-client/checkout/checkoutTypes";

type Props = {
  slug: string;
  stationId: string;
  qs: string;
  bumpActivity: () => void;
  onCancel: () => void;
};

type Step = "review" | "payment" | "success";

type SettleResult = Readonly<{
  orderId: number;
  checkId: number;
  settlementRecordId: string;
  settlementNumber: string;
  grandTotal: string;
  currencyCode: string;
  currencySymbol: string;
  paymentMethodSummary: string;
  alreadySettled: boolean;
}>;

export function KioskCheckoutStage({
  slug: _slug,
  stationId,
  qs: _qs,
  bumpActivity,
  onCancel,
}: Props) {
  const { language } = useLanguage();
  const lang = language === "ar" ? "ar" : "en";
  const runtime = useOrderingClientRuntime();
  const checkout = useOrderingCheckout();
  const cart = useOrderingCart();
  const restaurant = runtime.restaurant as {
    id?: number;
    currencySymbol?: string;
    nameAr?: string;
    nameEn?: string;
  } | null;
  const currency = restaurant?.currencySymbol ?? "ر.س";
  const restaurantName =
    lang === "ar"
      ? restaurant?.nameAr
      : restaurant?.nameEn || restaurant?.nameAr;

  const [step, setStep] = useState<Step>("review");
  const [placed, setPlaced] = useState<CheckoutPlaceOrderResult | null>(null);
  const [settleResult, setSettleResult] = useState<SettleResult | null>(null);
  const [selected, setSelected] = useState<MonetaryPaymentMethod | null>(null);
  const [amountPaid, setAmountPaid] = useState("");
  const [showReceipt, setShowReceipt] = useState(false);

  const settleMutation = trpc.order.settlePaid.useMutation();
  const receiptQuery = trpc.order.getSettlementReceipt.useQuery(
    {
      restaurantId: restaurant?.id ?? 0,
      orderId: settleResult?.orderId ?? 0,
      trackingToken: placed?.trackingToken ?? "",
      settlementRecordId: settleResult?.settlementRecordId ?? "",
    },
    {
      enabled:
        showReceipt &&
        !!restaurant?.id &&
        !!settleResult?.settlementRecordId &&
        !!placed?.trackingToken,
    }
  );

  const outstanding = useMemo(() => {
    if (settleResult) return settleResult.grandTotal;
    if (placed?.totalAmount != null) return String(placed.totalAmount);
    return checkout.totalAmount.toFixed(2);
  }, [settleResult, placed, checkout.totalAmount]);

  const remaining = computeRemainingDisplay(
    outstanding,
    amountPaid || outstanding
  );
  const methodOptions = listMonetaryPaymentMethodOptions(lang);

  const canSubmit =
    runtime.gates.platformCanPlaceOrder &&
    !!stationId.trim() &&
    checkout.summaryLines.length > 0;

  const handlePlaceOrder = async () => {
    bumpActivity();
    if (!restaurant?.id || !stationId.trim()) {
      toast.error(
        language === "ar"
          ? "يجب تحديد محطة الكiosk (station=)"
          : "Kiosk requires a station binding (?station=)"
      );
      return;
    }
    const outcome = await checkout.submit({
      restaurantId: restaurant.id,
      identity: buildKioskStationCheckoutIdentity(stationId),
      channelAllowsSubmit: canSubmit,
      deferTrackingNavigation: true,
    });
    if (!outcome.ok) {
      if (outcome.error.code !== "NOT_READY") {
        toast.error(outcome.error.message);
      }
      return;
    }
    setPlaced(outcome.result);
    const total =
      outcome.result.totalAmount != null
        ? String(outcome.result.totalAmount)
        : checkout.totalAmount.toFixed(2);
    setAmountPaid(total);
    setSelected(null);
    setStep("payment");
  };

  const handleRegisterPayment = async () => {
    bumpActivity();
    if (!restaurant?.id || !placed?.orderId || !placed.trackingToken || !selected) {
      return;
    }
    try {
      const result = await settleMutation.mutateAsync({
        restaurantId: restaurant.id,
        orderId: placed.orderId,
        trackingToken: placed.trackingToken,
        settlements: [...singleTenderSettlements(selected)],
      });
      setSettleResult(result);
      checkout.resetSubmission();
      cart.clearCart();
      setStep("success");
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : language === "ar"
            ? "تعذر تسجيل الدفع"
            : "Could not register payment";
      toast.error(message);
    }
  };

  const finishToConfirmation = () => {
    bumpActivity();
    if (placed?.trackingToken && runtime.navigator) {
      runtime.navigator.goToTracking(placed.trackingToken);
    }
  };

  if (runtime.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <Loader2 className="w-10 h-10 animate-spin text-orange-400" />
      </div>
    );
  }

  if (step === "success" && settleResult) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-5 bg-gradient-to-b from-teal-900 to-slate-900 text-white px-6 text-center pb-10">
        <CheckCircle2 className="h-16 w-16 text-emerald-400" aria-hidden />
        <p className="text-3xl md:text-4xl font-bold">
          {settlementRecordUiLabel("successTitle", lang)}
        </p>
        <p className="text-white/70">
          {settlementRecordUiLabel("successBody", lang)}
        </p>
        {placed?.displayReference ? (
          <p className="text-orange-300 text-2xl font-bold">
            {placed.displayReference}
          </p>
        ) : null}
        <p className="text-xl tabular-nums">
          {settleResult.currencySymbol}
          {settleResult.grandTotal}
        </p>

        <div className="flex w-full max-w-md flex-col gap-3 mt-2">
          <button
            type="button"
            onClick={() => {
              bumpActivity();
              setShowReceipt(true);
            }}
            className="w-full rounded-2xl bg-orange-500 py-4 text-lg font-bold"
          >
            {settlementRecordUiLabel("viewReceipt", lang)}
          </button>
          <button
            type="button"
            onClick={finishToConfirmation}
            className="w-full rounded-2xl bg-white/15 py-4 font-semibold"
          >
            {settlementRecordUiLabel("completedOrders", lang)}
          </button>
          <button
            type="button"
            onClick={finishToConfirmation}
            className="w-full rounded-2xl bg-white/10 py-3 text-sm"
          >
            {settlementRecordUiLabel("close", lang)}
          </button>
        </div>

        {showReceipt ? (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center">
            <div className="w-full max-w-md rounded-2xl bg-white text-slate-900 p-5 space-y-3 text-start">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold">
                  {settlementRecordUiLabel("receiptTitle", lang)}
                </h2>
                <button
                  type="button"
                  className="text-sm text-slate-500"
                  onClick={() => setShowReceipt(false)}
                >
                  {settlementRecordUiLabel("close", lang)}
                </button>
              </div>
              {restaurantName ? (
                <p className="text-center font-semibold">{restaurantName}</p>
              ) : null}
              {receiptQuery.isLoading ? (
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {settlementRecordUiLabel("loading", lang)}
                </div>
              ) : null}
              {receiptQuery.data ? (
                <div id="kiosk-settlement-receipt" className="space-y-2 text-sm">
                  <p className="text-center text-slate-500">
                    {receiptQuery.data.settlementNumber}
                  </p>
                  {receiptQuery.data.itemsSnapshot.map((item, idx) => (
                    <div
                      key={`${item.name}-${idx}`}
                      className="flex justify-between gap-2"
                    >
                      <span>
                        {item.quantity}× {item.name}
                      </span>
                      <span className="tabular-nums">
                        {item.unitPrice != null
                          ? `${receiptQuery.data.currencySymbol}${item.unitPrice}`
                          : ""}
                      </span>
                    </div>
                  ))}
                  <div className="border-t pt-2 flex justify-between font-semibold">
                    <span>{settlementRecordUiLabel("grandTotal", lang)}</span>
                    <span className="tabular-nums">
                      {receiptQuery.data.currencySymbol}
                      {receiptQuery.data.grandTotal}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="space-y-1 text-sm">
                  <p className="tabular-nums font-semibold">
                    {settleResult.currencySymbol}
                    {settleResult.grandTotal}
                  </p>
                  <p className="text-slate-500">{settleResult.settlementNumber}</p>
                </div>
              )}
              <button
                type="button"
                onClick={() => window.print()}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-3 text-white font-semibold"
              >
                <Printer className="h-4 w-4" />
                {settlementRecordUiLabel("printReceipt", lang)}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  if (step === "payment") {
    return (
      <div className="min-h-screen bg-slate-950 text-white pb-40">
        <header className="sticky top-0 z-10 border-b border-white/10 bg-slate-900/95 px-4 py-4">
          <h1 className="text-2xl font-bold">
            {settlementRecordUiLabel("registerPayment", lang)}
          </h1>
          {placed?.displayReference ? (
            <p className="text-sm text-orange-300 mt-1">{placed.displayReference}</p>
          ) : null}
        </header>

        <main className="px-4 py-6 space-y-5">
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
            <p className="text-xs uppercase tracking-wide text-white/50">
              {settlementRecordUiLabel("outstanding", lang)}
            </p>
            <p className="mt-1 text-3xl font-bold tabular-nums text-orange-400">
              {currency}
              {outstanding}
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">
              {settlementRecordUiLabel("paymentMethods", lang)}
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {methodOptions.map((opt) => {
                const active = selected === opt.paymentMethod;
                return (
                  <button
                    key={opt.paymentMethod}
                    type="button"
                    disabled={settleMutation.isPending}
                    onClick={() => {
                      bumpActivity();
                      setSelected(opt.paymentMethod);
                    }}
                    className={cn(
                      "h-14 rounded-xl border text-sm font-semibold",
                      active
                        ? "border-orange-400 bg-orange-500 text-white"
                        : "border-white/15 bg-white/5 text-white"
                    )}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-sm" htmlFor="kiosk-amount-paid">
                {settlementRecordUiLabel("amountPaid", lang)}
              </label>
              <input
                id="kiosk-amount-paid"
                inputMode="decimal"
                value={amountPaid}
                disabled={settleMutation.isPending}
                onChange={(e) => {
                  bumpActivity();
                  setAmountPaid(e.target.value);
                }}
                className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-3 tabular-nums"
              />
            </div>
            <div className="space-y-1">
              <p className="text-sm">{settlementRecordUiLabel("remaining", lang)}</p>
              <div className="flex h-[50px] items-center rounded-xl border border-white/15 bg-white/5 px-3 tabular-nums">
                {currency}
                {remaining}
              </div>
            </div>
          </div>
        </main>

        <div className="fixed bottom-0 inset-x-0 border-t border-white/10 bg-slate-900 p-4 space-y-3">
          <button
            type="button"
            disabled={settleMutation.isPending || selected == null}
            onClick={() => void handleRegisterPayment()}
            className="w-full rounded-2xl bg-orange-500 disabled:opacity-40 py-5 text-lg font-bold"
          >
            {settleMutation.isPending ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                {language === "ar" ? "جاري التسجيل..." : "Registering..."}
              </span>
            ) : (
              settlementRecordUiLabel("registerPayment", lang)
            )}
          </button>
          <button
            type="button"
            disabled={settleMutation.isPending}
            onClick={onCancel}
            className="w-full rounded-2xl bg-white/10 py-3 text-sm"
          >
            {settlementRecordUiLabel("cancel", lang)}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-36">
      <header className="sticky top-0 z-10 border-b border-white/10 bg-slate-900/95 px-4 py-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          {language === "ar" ? "مراجعة الطلب" : "Review Order"}
        </h1>
        <button
          type="button"
          onClick={() => {
            bumpActivity();
            runtime.navigator?.goToCart();
          }}
          className="text-sm text-white/70"
        >
          {language === "ar" ? "السلة" : "Cart"}
        </button>
      </header>

      <main className="px-4 py-6 space-y-4">
        <p className="text-sm text-white/60 px-1">
          {kioskCustomerFacingLabel(language === "ar")}
        </p>
        <ul className="rounded-2xl border border-white/10 divide-y divide-white/10 overflow-hidden">
          {checkout.summaryLines.map((line) => (
            <li
              key={line.menuItemId}
              className="px-4 py-3 flex justify-between gap-3"
            >
              <span>
                {language === "ar" ? line.nameAr : line.nameEn || line.nameAr} ×{" "}
                {line.quantity}
              </span>
              <span className="text-orange-300 font-semibold">
                {line.lineTotal.toFixed(2)} {currency}
              </span>
            </li>
          ))}
        </ul>
        <div className="flex justify-between text-xl font-bold px-1">
          <span>{language === "ar" ? "الإجمالي" : "Total"}</span>
          <span className="text-orange-400">
            {checkout.totalAmount.toFixed(2)} {currency}
          </span>
        </div>
        {checkout.supportsOrderNotes && (
          <textarea
            className="w-full rounded-xl bg-white/5 border border-white/10 p-3 text-white"
            rows={3}
            placeholder={
              language === "ar" ? "ملاحظات (اختياري)" : "Order notes (optional)"
            }
            value={checkout.orderNotes}
            onChange={(e) => {
              bumpActivity();
              checkout.setOrderNotes(e.target.value);
            }}
          />
        )}
      </main>

      <div className="fixed bottom-0 inset-x-0 border-t border-white/10 bg-slate-900 p-4 space-y-3">
        <button
          type="button"
          disabled={checkout.isSubmitting || !canSubmit}
          onClick={() => void handlePlaceOrder()}
          className="w-full rounded-2xl bg-orange-500 disabled:opacity-40 py-5 text-lg font-bold"
        >
          {checkout.isSubmitting
            ? language === "ar"
              ? "جاري الإرسال..."
              : "Submitting..."
            : language === "ar"
              ? "إرسال الطلب"
              : "Place Order"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="w-full rounded-2xl bg-white/10 py-3 text-sm"
        >
          {language === "ar" ? "إلغاء والعودة للبداية" : "Cancel & start over"}
        </button>
      </div>
    </div>
  );
}
