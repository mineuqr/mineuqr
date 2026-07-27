/**
 * REPORTING-PRODUCT-UX-RESTRUCTURE-2 — Premium empty / loading for executive period.
 */
import { ClipboardList, UtensilsCrossed } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import type { ExecutivePeriodScope } from "@/lib/reporting-exports/executivePeriodDashboard";

export function ExecutivePeriodEmptyState({
  scope,
  language,
  className,
}: {
  scope: ExecutivePeriodScope;
  language: "en" | "ar";
  className?: string;
}) {
  const isAr = language === "ar";
  const title =
    scope === "today"
      ? isAr
        ? "لا توجد مبيعات مسجّلة اليوم."
        : "No sales have been recorded today."
      : isAr
        ? "لا توجد مبيعات مسجّلة لهذا الشهر."
        : "No sales have been recorded this month.";
  const body =
    scope === "today"
      ? isAr
        ? "ابدأ خدمة العملاء وستظهر أرقام اليوم هنا."
        : "Start serving customers and today's business will appear here."
      : isAr
        ? "عند تسجيل الطلبات والمدفوعات ستظهر بطاقات هذا الشهر تلقائياً."
        : "When orders and payments are recorded, this month's cards will appear here.";

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-slate-700/50 bg-gradient-to-b from-slate-900/80 to-slate-950/90 px-6 py-12 text-center sm:px-10 sm:py-14",
        className
      )}
      role="status"
      aria-live="polite"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 30% 20%, #2dd4bf, transparent 45%), radial-gradient(circle at 70% 80%, #38bdf8, transparent 40%)",
        }}
        aria-hidden
      />
      <div className="relative mx-auto flex max-w-md flex-col items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-teal-500/30 bg-teal-500/10">
          <UtensilsCrossed className="h-8 w-8 text-teal-300" aria-hidden />
        </div>
        <div className="space-y-2">
          <p className="text-base font-semibold text-white sm:text-lg">{title}</p>
          <p className="text-sm leading-relaxed text-slate-400">{body}</p>
        </div>
        <p className="inline-flex items-center gap-2 text-xs text-slate-500">
          <ClipboardList className="h-3.5 w-3.5" aria-hidden />
          {isAr
            ? "لوحة التنفيذ جاهزة عندما يبدأ النشاط"
            : "Your executive board is ready when activity begins"}
        </p>
      </div>
    </div>
  );
}

export function ExecutivePeriodDashboardSkeleton({
  className,
}: {
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 lg:gap-4",
        className
      )}
      aria-busy="true"
      aria-label="Loading"
    >
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "rounded-2xl border border-slate-700/40 bg-slate-900/50 p-4",
            i === 5 && "sm:col-span-2 lg:col-span-2"
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="w-full space-y-3">
              <Skeleton className="h-3 w-24 bg-slate-700/60" />
              <Skeleton className="h-8 w-32 bg-slate-700/50" />
              <Skeleton className="h-3 w-40 bg-slate-800/80" />
            </div>
            <Skeleton className="h-6 w-6 shrink-0 rounded-md bg-slate-700/50" />
          </div>
        </div>
      ))}
    </div>
  );
}
