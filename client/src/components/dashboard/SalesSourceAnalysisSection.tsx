/**
 * REPORTING-PRODUCT-POLISH-1 — Sales Source Analysis (presentation shell).
 * Channel list is product UX. Values appear only when reporting publishes them.
 */
import { RestaurantDashSection } from "./RestaurantDashSection";
import { restaurantDash } from "./restaurantDashStyles";
import { cn } from "@/lib/utils";

const CHANNELS = [
  { id: "table", en: "Table Sessions", ar: "جلسات الطاولات" },
  { id: "waiter", en: "Waiter Orders", ar: "طلبات الويتر" },
  { id: "qr", en: "QR Ordering", ar: "الطلب عبر QR" },
  { id: "kiosk", en: "Self Ordering Kiosk", ar: "كيوسك الطلب الذاتي" },
] as const;

export function SalesSourceAnalysisSection({
  language,
  sectionId,
  emphasized,
}: {
  language: string;
  sectionId?: string;
  emphasized?: boolean;
}) {
  const isAr = language === "ar";
  const title = isAr ? "تحليل مصدر المبيعات" : "Sales Source Analysis";
  const note = isAr
    ? "القنوات جاهزة. تظهر أرقام كل مصدر تلقائياً عند توفرها."
    : "Channels are ready. Source totals appear automatically when available.";

  return (
    <RestaurantDashSection
      id={sectionId}
      title={title}
      description={note}
      ariaLabel={title}
      className={cn(
        emphasized &&
          "rounded-2xl ring-2 ring-orange-400/35 ring-offset-2 ring-offset-slate-950"
      )}
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4">
        {CHANNELS.map((ch) => (
          <div
            key={ch.id}
            className={cn(restaurantDash.kpiCardSupporting, "rounded-2xl p-4")}
          >
            <p className="text-xs font-medium text-slate-400 sm:text-sm">
              {isAr ? ch.ar : ch.en}
            </p>
            <p
              className="mt-2 text-lg font-semibold tabular-nums text-slate-500"
              aria-hidden
            >
              —
            </p>
            <p className="mt-1 text-[11px] leading-snug text-slate-600">
              {isAr ? "سيظهر عند توفر البيانات" : "Appears when data is available"}
            </p>
          </div>
        ))}
      </div>
    </RestaurantDashSection>
  );
}
