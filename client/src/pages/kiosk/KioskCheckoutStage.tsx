import { useLocation } from "wouter";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  buildKioskStationCheckoutIdentity,
  useOrderingCheckout,
  useOrderingClientRuntime,
} from "@/lib/ordering-client";
import { kioskCustomerFacingLabel } from "@/lib/ordering-client/kiosk/kioskPresentationLabels";

type Props = {
  slug: string;
  stationId: string;
  qs: string;
  bumpActivity: () => void;
  onCancel: () => void;
};

/**
 * Kiosk checkout chrome — consumes OrderingCheckoutProvider.
 * Places orders via station Fulfilment Anchor (no table binding, no fake tables).
 */
export function KioskCheckoutStage({
  slug,
  stationId,
  qs,
  bumpActivity,
  onCancel,
}: Props) {
  const { language } = useLanguage();
  const [, setLocation] = useLocation();
  const runtime = useOrderingClientRuntime();
  const checkout = useOrderingCheckout();
  const restaurant = runtime.restaurant as {
    id?: number;
    currencySymbol?: string;
  } | null;
  const currency = restaurant?.currencySymbol ?? "ر.س";

  const canSubmit =
    runtime.gates.platformCanPlaceOrder &&
    !!stationId.trim() &&
    checkout.summaryLines.length > 0;

  const handleSubmit = async () => {
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
    });
    if (!outcome.ok && outcome.error.code !== "NOT_READY") {
      toast.error(outcome.error.message);
    }
  };

  if (runtime.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <Loader2 className="w-10 h-10 animate-spin text-orange-400" />
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
            setLocation(`/kiosk/${slug}/cart?${qs}`);
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
          onClick={handleSubmit}
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
