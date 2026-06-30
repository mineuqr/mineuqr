import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type {
  OperationalPrintStatus,
  PrintingReadinessLevel,
} from "@/lib/print-workspace/operationalViewModels";
import {
  primaryActionLabel,
  readinessLevelLabel,
} from "@/lib/print-workspace/operationalViewModels";
import { AlertTriangle, CheckCircle2, Settings, XCircle } from "lucide-react";

const LEVEL_STYLES: Record<
  PrintingReadinessLevel,
  { border: string; bg: string; icon: string; Icon: typeof CheckCircle2 }
> = {
  printing_ready: {
    border: "border-emerald-500/40",
    bg: "bg-emerald-500/10",
    icon: "text-emerald-300",
    Icon: CheckCircle2,
  },
  setup_required: {
    border: "border-sky-500/35",
    bg: "bg-sky-500/8",
    icon: "text-sky-200",
    Icon: Settings,
  },
  attention_required: {
    border: "border-amber-500/35",
    bg: "bg-amber-500/8",
    icon: "text-amber-200",
    Icon: AlertTriangle,
  },
  printing_unavailable: {
    border: "border-red-500/30",
    bg: "bg-red-500/8",
    icon: "text-red-200",
    Icon: XCircle,
  },
};

export function PrintingStatusBanner({
  language,
  status,
  readinessLevel,
  onPrimaryAction,
}: {
  language: string;
  status: OperationalPrintStatus;
  readinessLevel: PrintingReadinessLevel;
  onPrimaryAction?: () => void;
}) {
  const isAr = language === "ar";
  const style = LEVEL_STYLES[readinessLevel];
  const { Icon } = style;
  const actionLabel = primaryActionLabel(status.nextAction, language);

  return (
    <div className={cn("rounded-2xl border px-5 py-4 sm:px-6 sm:py-5", style.border, style.bg)}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <div className={cn("rounded-full p-2", style.bg, style.icon)}>
            <Icon className="h-7 w-7" />
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              {readinessLevelLabel(readinessLevel, language)}
            </p>
            <p className="text-lg font-semibold tracking-tight text-white sm:text-xl">
              {isAr ? status.headline.ar : status.headline.en}
            </p>
            <p className="text-sm leading-relaxed text-slate-300">
              {isAr ? status.subline.ar : status.subline.en}
            </p>
          </div>
        </div>
        {actionLabel && onPrimaryAction && readinessLevel !== "printing_ready" ? (
          <Button type="button" size="sm" className="shrink-0" onClick={onPrimaryAction}>
            {actionLabel}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
