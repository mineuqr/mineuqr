import { cn } from "@/lib/utils";
import {
  formatHealthLabel,
  healthTone,
  type WorkspaceHealthState,
} from "@/lib/print-workspace/viewModels";

const TONE_CLASS: Record<ReturnType<typeof healthTone>, string> = {
  ok: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
  warn: "border-amber-500/40 bg-amber-500/10 text-amber-200",
  bad: "border-red-500/40 bg-red-500/10 text-red-300",
  muted: "border-slate-600/50 bg-slate-800/60 text-slate-400",
};

export function HealthStatusBadge({
  state,
  language,
  className,
}: {
  state: WorkspaceHealthState;
  language: string;
  className?: string;
}) {
  const tone = healthTone(state);
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        TONE_CLASS[tone],
        className
      )}
    >
      {formatHealthLabel(state, language)}
    </span>
  );
}
