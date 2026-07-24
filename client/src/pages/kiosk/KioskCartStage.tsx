import { useLanguage } from "@/contexts/LanguageContext";
import {
  useOrderingCart,
  useOrderingClientRuntime,
} from "@/lib/ordering-client";

type Props = {
  slug: string;
  qs: string;
  bumpActivity: () => void;
  onCancel: () => void;
};

/**
 * Kiosk cart chrome — consumes OrderingCartProvider only.
 * SELF-ORDERING-RUNTIME-IDENTITY-FIX-1 — stage transitions via OrderingNavigator.
 */
export function KioskCartStage({
  slug: _slug,
  qs: _qs,
  bumpActivity,
  onCancel,
}: Props) {
  const { language } = useLanguage();
  const cart = useOrderingCart();
  const runtime = useOrderingClientRuntime();
  const currency =
    (runtime.restaurant as { currencySymbol?: string } | null)?.currencySymbol ??
    "ر.س";

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-32">
      <header className="sticky top-0 z-10 border-b border-white/10 bg-slate-900/95 px-4 py-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          {language === "ar" ? "السلة" : "Cart"}
        </h1>
        <button
          type="button"
          onClick={() => {
            bumpActivity();
            runtime.navigator?.goToBrowse();
          }}
          className="text-sm text-white/70"
        >
          {language === "ar" ? "القائمة" : "Menu"}
        </button>
      </header>

      <ul className="px-4 py-4 space-y-3">
        {cart.items.map((item) => (
          <li
            key={item.menuItemId}
            className="rounded-2xl border border-white/10 bg-white/5 p-4 flex justify-between gap-3"
          >
            <div>
              <p className="font-semibold">
                {language === "ar" ? item.nameAr : item.nameEn || item.nameAr}
              </p>
              <div className="flex items-center gap-3 mt-2">
                <button
                  type="button"
                  className="w-10 h-10 rounded-full bg-white/10 text-xl"
                  onClick={() => {
                    bumpActivity();
                    cart.updateQuantity(item.menuItemId, item.quantity - 1);
                  }}
                >
                  −
                </button>
                <span className="font-bold w-6 text-center">{item.quantity}</span>
                <button
                  type="button"
                  className="w-10 h-10 rounded-full bg-white/10 text-xl"
                  onClick={() => {
                    bumpActivity();
                    cart.updateQuantity(item.menuItemId, item.quantity + 1);
                  }}
                >
                  +
                </button>
              </div>
            </div>
            <p className="font-bold text-orange-300">
              {(parseFloat(item.price) * item.quantity).toFixed(2)} {currency}
            </p>
          </li>
        ))}
        {cart.items.length === 0 && (
          <p className="text-white/50 text-center py-12">
            {language === "ar" ? "السلة فارغة" : "Cart is empty"}
          </p>
        )}
      </ul>

      <div className="fixed bottom-0 inset-x-0 border-t border-white/10 bg-slate-900 p-4 space-y-3">
        <div className="flex justify-between text-lg font-bold px-1">
          <span>{language === "ar" ? "الإجمالي" : "Total"}</span>
          <span className="text-orange-400">
            {cart.totalAmount.toFixed(2)} {currency}
          </span>
        </div>
        <button
          type="button"
          disabled={cart.items.length === 0}
          onClick={() => {
            bumpActivity();
            runtime.navigator?.goToCheckout();
          }}
          className="w-full rounded-2xl bg-orange-500 disabled:opacity-40 py-5 text-lg font-bold"
        >
          {language === "ar" ? "الدفع" : "Checkout"}
        </button>
        <button
          type="button"
          onClick={() => {
            bumpActivity();
            onCancel();
          }}
          className="w-full rounded-2xl border border-white/20 py-3 text-sm text-white/70"
        >
          {language === "ar" ? "إلغاء" : "Cancel"}
        </button>
      </div>
    </div>
  );
}
