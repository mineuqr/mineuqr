/**
 * REGISTER-OPERATIONS-UI-UX-REFINEMENT-1 — operational status badges.
 * Renders backend duty / catalog / shift presence only.
 */

import { cn } from "@/lib/utils";
import type {
  AvailabilityBadgeTone,
  DutyBadgeTone,
  ShiftBadgeTone,
} from "@/lib/register-operations-presentation";

const dutyClass: Record<DutyBadgeTone, string> = {
  open: "border-emerald-500/40 bg-emerald-500/15 text-emerald-200",
  suspended: "border-amber-500/40 bg-amber-500/15 text-amber-100",
  closed: "border-slate-500/40 bg-slate-500/15 text-slate-300",
};

const dutyDot: Record<DutyBadgeTone, string> = {
  open: "bg-emerald-400",
  suspended: "bg-amber-400",
  closed: "bg-slate-400",
};

const availabilityClass: Record<AvailabilityBadgeTone, string> = {
  ready: "border-cyan-500/35 bg-cyan-500/10 text-cyan-100",
  unavailable: "border-slate-600/50 bg-slate-800/60 text-slate-400",
};

const shiftClass: Record<ShiftBadgeTone, string> = {
  active: "border-violet-500/40 bg-violet-500/15 text-violet-100",
  none: "border-slate-600/40 bg-slate-900/50 text-slate-400",
};

export function DutyBadge({
  tone,
  label,
  className,
}: {
  tone: DutyBadgeTone;
  label: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        dutyClass[tone],
        className
      )}
    >
      <span
        className={cn("size-1.5 shrink-0 rounded-full", dutyDot[tone])}
        aria-hidden
      />
      {label}
    </span>
  );
}

export function AvailabilityBadge({
  tone,
  label,
  className,
}: {
  tone: AvailabilityBadgeTone;
  label: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        availabilityClass[tone],
        className
      )}
    >
      {label}
    </span>
  );
}

export function ShiftBadge({
  tone,
  label,
  className,
}: {
  tone: ShiftBadgeTone;
  label: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        shiftClass[tone],
        className
      )}
    >
      {label}
    </span>
  );
}
