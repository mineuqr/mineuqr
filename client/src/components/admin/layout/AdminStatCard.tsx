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
};

export function AdminStatCard({
  title,
  value,
  icon: Icon,
  hint,
  loading = false,
  valueClassName,
  valueDir = "auto",
}: AdminStatCardProps) {
  return (
    <Card className={adminDash.kpiCard}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xs font-medium text-muted-foreground sm:text-sm">{title}</CardTitle>
        <Icon className="h-4 w-4 shrink-0 text-primary" aria-hidden />
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-20" />
        ) : (
          <div
            dir={valueDir}
            className={cn("text-xl font-bold tabular-nums sm:text-2xl", valueClassName)}
          >
            {value}
          </div>
        )}
        {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}
