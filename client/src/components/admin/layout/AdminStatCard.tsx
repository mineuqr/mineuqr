import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { adminDash } from "./adminDashStyles";

type AdminStatCardProps = {
  title: string;
  value: string | number;
  icon: LucideIcon;
  hint?: string;
  loading?: boolean;
  valueClassName?: string;
  /** Isolate numbers/dates in LTR for RTL layouts. */
  valueDir?: "ltr" | "rtl" | "auto";
  /** UX-REFINE-1C — denser KPI strip for overview console */
  compact?: boolean;
};

export function AdminStatCard({
  title,
  value,
  icon: Icon,
  hint,
  loading = false,
  valueClassName,
  valueDir = "auto",
  compact = false,
}: AdminStatCardProps) {
  return (
    <Card className={adminDash.kpiCard}>
      <CardHeader
        className={cn(
          "flex flex-row items-center justify-between space-y-0",
          compact ? "px-3 pb-1 pt-3" : "px-4 pb-2 pt-4"
        )}
      >
        <CardTitle
          className={cn(
            "font-medium text-slate-400",
            compact ? "text-[11px] leading-tight" : "text-xs sm:text-sm"
          )}
        >
          {title}
        </CardTitle>
        <Icon className={cn("shrink-0 text-cyan-400", compact ? "h-3.5 w-3.5" : "h-4 w-4")} aria-hidden />
      </CardHeader>
      <CardContent className={compact ? "px-3 pb-3" : "px-4 pb-4"}>
        {loading ? (
          <Skeleton className={compact ? "h-7 w-16" : "h-8 w-20"} />
        ) : (
          <div
            dir={valueDir}
            className={cn(
              "font-bold tabular-nums text-white",
              compact ? "text-lg sm:text-xl" : "text-xl sm:text-2xl",
              valueClassName
            )}
          >
            {value}
          </div>
        )}
        {hint ? (
          <p className={cn("text-cyan-300/80", compact ? "mt-0.5 text-[10px] leading-tight" : "mt-1 text-xs")}>
            {hint}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
