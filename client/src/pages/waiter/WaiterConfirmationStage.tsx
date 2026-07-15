import { useSearch } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { loadConfirmationDisplayIdentity } from "@/lib/orderConfirmationStorage";

type Props = {
  tableNumber: number;
  /** Screen Runtime host may pass token without URL query. */
  trackingToken?: string | null;
  onBackToTables: () => void;
  onOrderAgain: () => void;
};

/**
 * Waiter confirmation — renders server displayReference only (WT #NNN).
 */
export function WaiterConfirmationStage({
  tableNumber,
  trackingToken,
  onBackToTables,
  onOrderAgain,
}: Props) {
  const { language } = useLanguage();
  const search = useSearch();
  let token = trackingToken?.trim() ?? "";
  if (!token) {
    try {
      token =
        new URLSearchParams(search.startsWith("?") ? search : `?${search}`).get(
          "token"
        ) ?? "";
    } catch {
      token = "";
    }
  }

  const identity = token ? loadConfirmationDisplayIdentity(token) : null;
  const displayReference = identity?.displayReference?.trim() || "";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-gradient-to-b from-teal-950 to-slate-950 text-white px-8 text-center">
      <p className="text-sm text-white/60">
        {language === "ar" ? `طاولة ${tableNumber}` : `Table ${tableNumber}`}
      </p>
      <p className="text-4xl md:text-5xl font-bold">
        {language === "ar" ? "تم إرسال الطلب" : "Order placed"}
      </p>
      {displayReference ? (
        <div className="space-y-1">
          <p className="text-white/60 text-sm">
            {language === "ar" ? "رقم الطلب" : "Order Number"}
          </p>
          <p className="text-3xl md:text-4xl font-bold tracking-wide text-teal-300">
            {displayReference}
          </p>
        </div>
      ) : null}
      <div className="flex flex-col sm:flex-row gap-3 mt-4">
        <button
          type="button"
          onClick={onOrderAgain}
          className="rounded-2xl bg-teal-500 px-8 py-4 font-semibold text-slate-950"
        >
          {language === "ar" ? "طلب إضافي لنفس الطاولة" : "Order again for table"}
        </button>
        <button
          type="button"
          onClick={onBackToTables}
          className="rounded-2xl bg-white/15 px-8 py-4 font-semibold"
        >
          {language === "ar" ? "العودة للطاولات" : "Back to tables"}
        </button>
      </div>
    </div>
  );
}
