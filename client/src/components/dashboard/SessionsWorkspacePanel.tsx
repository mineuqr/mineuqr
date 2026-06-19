import { RestaurantDashSection } from "@/components/dashboard/RestaurantDashSection";
import { RestaurantKpiGridSkeleton } from "@/components/dashboard/RestaurantKpiCard";
import { restaurantDash } from "@/components/dashboard/restaurantDashStyles";
import { cn } from "@/lib/utils";

function PanelSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className={cn(restaurantDash.panel, "divide-y divide-cyan-500/15 overflow-hidden")}>
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex animate-pulse items-center gap-3 px-4 py-3 sm:px-5 sm:py-4">
          <div className="h-9 w-9 shrink-0 rounded-xl bg-slate-800/80" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-4 w-40 max-w-full rounded bg-slate-800/70" />
            <div className="h-3 w-28 max-w-full rounded bg-slate-800/50" />
          </div>
          <div className="h-8 w-20 shrink-0 rounded-lg bg-slate-800/60" />
        </div>
      ))}
    </div>
  );
}

export function SessionsWorkspacePanel({ language }: { language: string }) {
  const isAr = language === "ar";
  const pageTitle = isAr ? "الجلسات" : "Sessions";
  const pageSub = isAr
    ? "مساحة العمل التشغيلية للجلسات النشطة والنشاط والتسوية"
    : "Operational workspace for active sessions, activity, and settlement visibility";

  return (
    <div className={restaurantDash.stack}>
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">{pageTitle}</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-slate-400">{pageSub}</p>
      </div>

      <RestaurantDashSection
        title={isAr ? "مؤشرات الجلسات" : "Session KPIs"}
        description={
          isAr
            ? "نظرة سريعة على الجلسات التشغيلية"
            : "At-a-glance operational session metrics"
        }
        ariaLabel={isAr ? "مؤشرات الجلسات" : "Session KPIs"}
      >
        <RestaurantKpiGridSkeleton count={4} />
      </RestaurantDashSection>

      <RestaurantDashSection
        title={isAr ? "الجلسات النشطة" : "Active Sessions"}
        description={
          isAr
            ? "الجلسات المفتوحة التي تحتاج متابعة الآن"
            : "Open sessions that need attention right now"
        }
        ariaLabel={isAr ? "الجلسات النشطة" : "Active Sessions"}
      >
        <PanelSkeleton rows={4} />
      </RestaurantDashSection>

      <RestaurantDashSection
        title={isAr ? "نشاط الجلسات" : "Session Activity"}
        description={
          isAr
            ? "آخر أحداث الجلسات والطلبات"
            : "Latest session and order events"
        }
        ariaLabel={isAr ? "نشاط الجلسات" : "Session Activity"}
      >
        <PanelSkeleton rows={5} />
      </RestaurantDashSection>
    </div>
  );
}
