import { useLocation } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { useOrderingCart, useOrderingClientRuntime } from "@/lib/ordering-client";

type Props = {
  slug: string;
  qs: string;
  tableNumber: number;
};

/** Waiter cart chrome — consumes OrderingCartProvider only. */
export function WaiterCartStage({ slug, qs, tableNumber }: Props) {
  const { language } = useLanguage();
  const [, setLocation] = useLocation();
  const cart = useOrderingCart();
  const runtime = useOrderingClientRuntime();
  const currency =
    (runtime.restaurant as { currencySymbol?: string } | null)?.currencySymbol ??
    "ر.س";

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-32">
      <header className="sticky top-0 z-10 border-b border-white/10 bg-slate-900/95 px-4 py-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-white/50">
            {language === "ar" ? `طاولة ${tableNumber}` : `Table ${tableNumber}`}
          </p>
          <h1 className="text-2xl font-bold">
            {language === "ar" ? "السلة" : "Cart"}
          </h1>
        </div>
        <button
          type="button"
          onClick={() => setLocation(`/waiter/${slug}/menu?${qs}`)}
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
                  onClick={() =>
                    cart.updateQuantity(item.menuItemId, item.quantity - 1)
                  }
                >
                  −
                </button>
                <span className="font-bold w-6 text-center">{item.quantity}</span>
                <button
                  type="button"
                  className="w-10 h-10 rounded-full bg-white/10 text-xl"
                  onClick={() =>
                    cart.updateQuantity(item.menuItemId, item.quantity + 1)
                  }
                >
                  +
                </button>
              </div>
            </div>
            <p className="font-bold text-teal-300">
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

      <div className="fixed bottom-0 inset-x-0 border-t border-white/10 bg-slate-900/95 px-4 py-4 flex items-center justify-between gap-3">
        <p className="font-bold">
          {cart.totalAmount.toFixed(2)} {currency}
        </p>
        <button
          type="button"
          disabled={cart.items.length === 0}
          onClick={() => setLocation(`/waiter/${slug}/checkout?${qs}`)}
          className="rounded-xl bg-teal-500 px-6 py-3 font-bold text-slate-950 disabled:opacity-40"
        >
          {language === "ar" ? "متابعة" : "Checkout"}
        </button>
      </div>
    </div>
  );
}
