import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  type SessionStatusFilter,
  type SessionStatusMetrics,
  sessionStatusFilterLabel,
  sessionStatusMetricLabel,
} from "@/lib/sessionWorkspaceOps";
import { cn } from "@/lib/utils";
import { Search } from "lucide-react";
import { restaurantDash } from "./restaurantDashStyles";

const STATUS_FILTERS: SessionStatusFilter[] = [
  "all",
  "open",
  "paid",
  "complimentary",
];

export function SessionOperationsToolbar({
  isAr,
  searchQuery,
  onSearchQueryChange,
  statusFilter,
  onStatusFilterChange,
  metrics,
}: {
  isAr: boolean;
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  statusFilter: SessionStatusFilter;
  onStatusFilterChange: (filter: SessionStatusFilter) => void;
  metrics: SessionStatusMetrics;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <Search
          className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
          aria-hidden
        />
        <Input
          type="search"
          value={searchQuery}
          onChange={(event) => onSearchQueryChange(event.target.value)}
          placeholder={
            isAr
              ? "ابحث برقم الجلسة أو الطاولة…"
              : "Search by session ID, table name, or number…"
          }
          className={cn(
            "h-10 border-cyan-500/25 bg-slate-900/50 ps-9 text-sm text-white placeholder:text-slate-500",
            restaurantDash.toolbarBtn
          )}
          aria-label={isAr ? "بحث الجلسات" : "Search sessions"}
        />
      </div>

      <div
        className="flex flex-wrap gap-2"
        role="group"
        aria-label={isAr ? "تصفية حالة الجلسة" : "Session status filter"}
      >
        {STATUS_FILTERS.map((filter) => (
          <Button
            key={filter}
            type="button"
            size="sm"
            variant={statusFilter === filter ? "default" : "outline"}
            className={cn(
              "min-w-[5.5rem]",
              statusFilter === filter
                ? restaurantDash.toolbarBtnActive
                : restaurantDash.toolbarBtn
            )}
            onClick={() => onStatusFilterChange(filter)}
          >
            {sessionStatusFilterLabel(filter, isAr)}
          </Button>
        ))}
      </div>

      <div
        className={cn(
          "grid grid-cols-1 gap-2 sm:grid-cols-3",
          restaurantDash.panelInset,
          "p-3"
        )}
        aria-label={isAr ? "مؤشرات الجلسات التشغيلية" : "Operational session metrics"}
      >
        {(Object.keys(metrics) as Array<keyof SessionStatusMetrics>).map((metric) => (
          <div key={metric} className="flex items-center justify-between gap-3 sm:flex-col sm:items-start sm:gap-1">
            <span className="text-xs font-medium text-slate-400">
              {sessionStatusMetricLabel(metric, isAr)}
            </span>
            <span dir="ltr" className="text-lg font-semibold tabular-nums text-white">
              {metrics[metric]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
