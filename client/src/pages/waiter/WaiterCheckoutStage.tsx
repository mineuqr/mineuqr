import { useLocation } from "wouter";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  buildWaiterTableCheckoutIdentity,
  useOrderingCart,
  useOrderingCheckout,
  useOrderingClientRuntime,
  useOptionalOrderingClientRuntime,
} from "@/lib/ordering-client";
import { screenTrpc } from "@/lib/operational-screen/screenTrpc";
import { saveConfirmationDisplayIdentity } from "@/lib/orderConfirmationStorage";

type Props = {
  slug: string;
  qs: string;
  tableId: number;
  tableNumber: number;
  sessionToken?: string;
  /** WAITER-SCREEN-HOSTED-AUTH-ADOPTION-1 — device for /screen host. */
  placeAuth?: "staff" | "device";
};

/**
 * Waiter checkout chrome — consumes OrderingCheckoutProvider.
 * Staff place → order.placeAsWaiter; device place → screen runtime placeWaiterOrder.
 */
export function WaiterCheckoutStage(props: Props) {
  if (props.placeAuth === "device") {
    return <WaiterDeviceCheckoutStage {...props} />;
  }
  return <WaiterStaffCheckoutStage {...props} />;
}

function WaiterCheckoutChrome({
  tableNumber,
  canSubmit,
  isSubmitting,
  onSubmit,
  onBackToCart,
}: {
  tableNumber: number;
  canSubmit: boolean;
  isSubmitting: boolean;
  onSubmit: () => void;
  onBackToCart: () => void;
}) {
  const { language } = useLanguage();
  const runtime = useOrderingClientRuntime();
  const checkout = useOrderingCheckout();
  const restaurant = runtime.restaurant as {
    currencySymbol?: string;
  } | null;
  const currency = restaurant?.currencySymbol ?? "ر.س";

  if (runtime.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <Loader2 className="w-10 h-10 animate-spin text-teal-400" />
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
          onClick={onBackToCart}
          className="text-sm text-white/70"
        >
          {language === "ar" ? "السلة" : "Cart"}
        </button>
      </header>

      <main className="px-4 py-6 space-y-4">
        <p className="text-sm text-white/60 px-1">
          {language === "ar"
            ? `طاولة ${tableNumber} · طلب نادل`
            : `Table ${tableNumber} · Waiter order`}
        </p>
        <ul className="rounded-2xl border border-white/10 divide-y divide-white/10 overflow-hidden">
          {checkout.summaryLines.map((line) => (
            <li
              key={line.menuItemId}
              className="px-4 py-3 flex justify-between gap-3"
            >
              <div>
                <p className="font-semibold">
                  {language === "ar"
                    ? line.nameAr
                    : line.nameEn || line.nameAr}
                </p>
                <p className="text-sm text-white/50">× {line.quantity}</p>
              </div>
              <p className="font-bold text-teal-300">
                {line.lineTotal.toFixed(2)} {currency}
              </p>
            </li>
          ))}
        </ul>

        <label className="block space-y-2">
          <span className="text-sm text-white/60">
            {language === "ar" ? "ملاحظات الطلب" : "Order notes"}
          </span>
          <textarea
            value={checkout.orderNotes}
            onChange={(e) => checkout.setOrderNotes(e.target.value)}
            maxLength={checkout.maxOrderNoteLength}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white"
            rows={3}
          />
        </label>

        {checkout.lastError ? (
          <p className="text-sm text-red-300">{checkout.lastError.message}</p>
        ) : null}
      </main>

      <div className="fixed bottom-0 inset-x-0 border-t border-white/10 bg-slate-900/95 px-4 py-4 flex items-center justify-between gap-3">
        <p className="font-bold">
          {checkout.totalAmount.toFixed(2)} {currency}
        </p>
        <button
          type="button"
          disabled={!canSubmit || isSubmitting}
          onClick={onSubmit}
          className="rounded-xl bg-teal-500 px-6 py-3 font-bold text-slate-950 disabled:opacity-40"
        >
          {isSubmitting
            ? language === "ar"
              ? "جاري الإرسال..."
              : "Sending..."
            : language === "ar"
              ? "إرسال الطلب"
              : "Place order"}
        </button>
      </div>
    </div>
  );
}

function WaiterStaffCheckoutStage({
  slug,
  qs,
  tableId,
  tableNumber,
  sessionToken,
}: Props) {
  const { language } = useLanguage();
  const [, setLocation] = useLocation();
  const runtime = useOrderingClientRuntime();
  const checkout = useOrderingCheckout();
  const restaurant = runtime.restaurant as { id?: number } | null;

  const canSubmit =
    runtime.gates.platformCanPlaceOrder &&
    tableId > 0 &&
    tableNumber > 0 &&
    checkout.summaryLines.length > 0;

  const handleSubmit = async () => {
    if (!restaurant?.id) {
      toast.error(
        language === "ar" ? "المطعم غير جاهز" : "Restaurant not ready"
      );
      return;
    }
    const outcome = await checkout.submit({
      restaurantId: restaurant.id,
      ...(sessionToken ? { sessionToken } : {}),
      identity: buildWaiterTableCheckoutIdentity({
        tableId,
        tableNumber,
        placeAuth: "staff",
      }),
      channelAllowsSubmit: canSubmit,
    });
    if (!outcome.ok && outcome.error.code !== "NOT_READY") {
      toast.error(outcome.error.message);
    }
  };

  return (
    <WaiterCheckoutChrome
      tableNumber={tableNumber}
      canSubmit={canSubmit}
      isSubmitting={checkout.isSubmitting}
      onSubmit={() => void handleSubmit()}
      onBackToCart={() => setLocation(`/waiter/${slug}/cart?${qs}`)}
    />
  );
}

/**
 * Hosted Screen Runtime checkout — uses device credentials (screenTrpc).
 * Must only mount under ScreenRuntimeProvider.
 */
function WaiterDeviceCheckoutStage({
  tableId,
  tableNumber,
  sessionToken,
}: Props) {
  const { language } = useLanguage();
  const runtime = useOrderingClientRuntime();
  const orderingClient = useOptionalOrderingClientRuntime();
  const checkout = useOrderingCheckout();
  const cart = useOrderingCart();
  const restaurant = runtime.restaurant as { id?: number } | null;
  const placeMutation =
    screenTrpc.operationalDevice.runtime.placeWaiterOrder.useMutation();

  const canSubmit =
    runtime.gates.platformCanPlaceOrder &&
    tableId > 0 &&
    tableNumber > 0 &&
    checkout.summaryLines.length > 0 &&
    !!restaurant?.id;

  const handleSubmit = async () => {
    if (!restaurant?.id) {
      toast.error(
        language === "ar" ? "المطعم غير جاهز" : "Restaurant not ready"
      );
      return;
    }
    try {
      const result = await placeMutation.mutateAsync({
        serviceMode: "table_service",
        fulfilmentAnchor: {
          anchorType: "table",
          tableId,
          tableNumber,
        },
        ...(sessionToken ? { sessionToken } : {}),
        notes: checkout.orderNotes || undefined,
        items: checkout.summaryLines.map((line) => ({
          menuItemId: line.menuItemId,
          quantity: line.quantity,
          notes: line.notes,
        })),
      });
      if (!result.trackingToken) {
        toast.error(
          language === "ar" ? "تعذر إرسال الطلب" : "Could not place order"
        );
        return;
      }
      if (result.displayReference) {
        saveConfirmationDisplayIdentity(result.trackingToken, {
          displayReference: result.displayReference,
          orderNumber: result.orderNumber,
        });
      }
      cart.clearCart();
      checkout.setOrderNotes("");
      orderingClient?.navigator?.goToTracking(result.trackingToken);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : language === "ar"
            ? "تعذر إرسال الطلب"
            : "Could not place order";
      toast.error(message);
    }
  };

  return (
    <WaiterCheckoutChrome
      tableNumber={tableNumber}
      canSubmit={canSubmit}
      isSubmitting={placeMutation.isPending}
      onSubmit={() => void handleSubmit()}
      onBackToCart={() => orderingClient?.navigator?.goToCart()}
    />
  );
}
