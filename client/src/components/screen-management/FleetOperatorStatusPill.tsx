import { cn } from "@/lib/utils";
import type { OperatorFleetStatusKind } from "@/lib/screen-management/operatorFleetPresentation";
import {
  operatorFleetStatusLabel,
  operatorFleetStatusPillClass,
} from "@/lib/screen-management/operatorFleetPresentation";

/**
 * SCREEN-MANAGEMENT-UX-1B — single status pill used by cards and table.
 */
export function FleetOperatorStatusPill({
  kind,
  language,
  className,
}: {
  kind: OperatorFleetStatusKind;
  language: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 truncate rounded-full px-2.5 py-0.5 text-xs font-medium",
        operatorFleetStatusPillClass(kind),
        className
      )}
      data-operator-status={kind}
    >
      {operatorFleetStatusLabel(kind, language)}
    </span>
  );
}
