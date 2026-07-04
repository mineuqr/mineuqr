import { cn } from "@/lib/utils";
import type { SlaSnapshot } from "@/lib/operational-workspace/slaEngine";
import { formatElapsedLabel } from "@/lib/operational-workspace/slaEngine";

export function SlaIndicator({
  sla,
  isAr,
  compact,
}: {
  sla: SlaSnapshot;
  isAr: boolean;
  compact?: boolean;
}) {
  const tone =
    sla.status === "critical"
      ? "text-destructive"
      : sla.status === "late"
        ? "text-amber-600"
        : sla.status === "at-risk"
          ? "text-amber-500"
          : "text-muted-foreground";

  return (
    <div className={cn("flex flex-wrap items-center gap-2 text-sm", tone)}>
      <span className={cn(!compact && "text-base font-semibold tabular-nums")}>
        {formatElapsedLabel(sla.elapsedSeconds, isAr)}
      </span>
      {!compact ? (
        <span className="text-xs text-muted-foreground">
          / {formatElapsedLabel(sla.targetSeconds, isAr)} {isAr ? "هدف" : "target"}
        </span>
      ) : null}
      {sla.lateSeconds > 0 ? (
        <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
          +{formatElapsedLabel(sla.lateSeconds, isAr)} {isAr ? "تأخير" : "late"}
        </span>
      ) : null}
    </div>
  );
}
