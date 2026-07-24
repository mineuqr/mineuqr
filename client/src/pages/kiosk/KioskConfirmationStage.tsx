import { useSearch } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { loadConfirmationDisplayIdentity } from "@/lib/orderConfirmationStorage";

type Props = {
  slug: string;
  /** Hosted screen mode may pass token without URL query. */
  trackingToken?: string | null;
  onDone: () => void;
};

/**
 * Channel-owned confirmation + path to automatic reset.
 * ORDER-CONFIRMATION-PRESENTATION-ADOPTION-1 — shows server displayReference only;
 * trackingToken remains internal for handoff lookup.
 */
export function KioskConfirmationStage({ trackingToken, onDone }: Props) {
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

  // SELF-ORDERING-COUNTER-PICKUP-ARCHITECTURE-1 — Phase 2:
  // Confirmation ends the customer journey (operational identity only; no payment/settlement copy).
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-gradient-to-b from-teal-900 to-slate-900 text-white px-8 text-center">
      <p className="text-4xl md:text-5xl font-bold">
        {language === "ar" ? "تم استلام طلبك" : "Your Order Has Been Received"}
      </p>
      {displayReference ? (
        <div className="space-y-1">
          <p className="text-white/60 text-sm">
            {language === "ar" ? "رقم الاستلام" : "Pickup Number"}
          </p>
          <p className="text-3xl md:text-4xl font-bold tracking-wide text-orange-300">
            {displayReference}
          </p>
        </div>
      ) : null}
      <p className="text-white/60">
        {language === "ar"
          ? "توجه إلى الكاشير لإتمام الدفع. سيتم إعادة الشاشة تلقائياً..."
          : "Please proceed to the cashier to pay. Returning to start automatically..."}
      </p>
      <button
        type="button"
        onClick={onDone}
        className="mt-4 rounded-2xl bg-white/15 px-8 py-4 font-semibold"
      >
        {language === "ar" ? "طلب جديد" : "New order"}
      </button>
    </div>
  );
}
