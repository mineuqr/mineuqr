/**
 * REPORTING-PRODUCT-POLISH-1 — Shared period toolbar (presentation only).
 */
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { restaurantDash } from "./restaurantDashStyles";

export const reportingPeriodSelectClass =
  "min-h-10 rounded-xl border border-cyan-500/30 bg-slate-900/70 px-3 py-2 text-xs font-medium text-slate-100 shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60";

export function ReportingPeriodToolbar({
  title,
  month,
  year,
  monthNames,
  years,
  onMonthChange,
  onYearChange,
  className,
}: {
  title: string;
  month: number;
  year: number;
  monthNames: readonly string[];
  years?: readonly number[];
  onMonthChange: (month: number) => void;
  onYearChange: (year: number) => void;
  className?: string;
}) {
  const yearOptions = years ?? [2024, 2025, 2026, 2027];

  return (
    <Card
      className={cn(
        restaurantDash.card,
        "gap-0 py-0 shadow-none",
        className
      )}
    >
      <CardHeader className="pb-3 pt-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className={cn(restaurantDash.sectionTitle, "text-sm sm:text-base")}>
            {title}
          </CardTitle>
          <div
            className="flex flex-wrap items-center gap-2"
            role="group"
            aria-label={title}
          >
            <select
              value={month}
              onChange={(e) => onMonthChange(Number(e.target.value))}
              className={reportingPeriodSelectClass}
              aria-label={monthNames[month - 1] ?? "Month"}
            >
              {monthNames.map((name, idx) => (
                <option key={name} value={idx + 1}>
                  {name}
                </option>
              ))}
            </select>
            <select
              value={year}
              onChange={(e) => onYearChange(Number(e.target.value))}
              className={reportingPeriodSelectClass}
              aria-label={String(year)}
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>
      </CardHeader>
    </Card>
  );
}
