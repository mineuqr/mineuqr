import { cn } from "@/lib/utils";
import type { OperationalPrintStatus } from "@/lib/print-workspace/operationalViewModels";
import { CheckCircle2, XCircle } from "lucide-react";

export function SystemReadyBanner({
  language,
  status,
}: {
  language: string;
  status: OperationalPrintStatus;
}) {
  const isAr = language === "ar";
  const ready = status.systemReady === "ready";

  return (
    <div
      className={cn(
        "rounded-2xl border px-5 py-4 sm:px-6 sm:py-5",
        ready
          ? "border-emerald-500/40 bg-emerald-500/10"
          : "border-amber-500/35 bg-amber-500/8"
      )}
    >
      <div className="flex items-start gap-4">
        <div
          className={cn(
            "rounded-full p-2",
            ready ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-500/20 text-amber-200"
          )}
        >
          {ready ? <CheckCircle2 className="h-7 w-7" /> : <XCircle className="h-7 w-7" />}
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-lg font-semibold tracking-tight text-white sm:text-xl">
            {isAr ? status.headline.ar : status.headline.en}
          </p>
          <p className="text-sm leading-relaxed text-slate-300">
            {isAr ? status.subline.ar : status.subline.en}
          </p>
        </div>
      </div>
    </div>
  );
}
