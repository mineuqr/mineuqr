import type { DelayReason } from "@/lib/operational-workspace/delayIntelligence";
import { cn } from "@/lib/utils";
import { AlertTriangle, Clock, Printer, CheckCircle2 } from "lucide-react";

const ICONS: Record<DelayReason, typeof Clock> = {
  "waiting-acceptance": Clock,
  "preparing-sla-exceeded": AlertTriangle,
  "ready-not-served": AlertTriangle,
  "printing-failed": Printer,
  "on-track": CheckCircle2,
  completed: CheckCircle2,
};

export function DelayExplanation({
  reason,
  message,
}: {
  reason: DelayReason;
  message: string;
}) {
  const Icon = ICONS[reason];
  const tone =
    reason === "printing-failed" || reason === "preparing-sla-exceeded" || reason === "ready-not-served"
      ? "text-amber-700 dark:text-amber-400"
      : "text-muted-foreground";

  return (
    <p className={cn("flex items-start gap-2 text-sm", tone)}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <span>{message}</span>
    </p>
  );
}
