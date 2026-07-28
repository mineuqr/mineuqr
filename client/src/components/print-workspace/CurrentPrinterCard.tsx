/**
 * SEMANTIC-CARD-PLATFORM-ADOPTION-1
 * Current printer ops surface — status via SemanticBadge.
 */
import { Button } from "@/components/ui/button";
import {
  SemanticBadge,
  mapHealthToneToBadgeTone,
} from "@/design-system/semantic-badge";
import {
  derivePrinterOperationalState,
  printerStateGuidance,
  printerStateLabel,
} from "@/lib/print-workspace/operationalViewModels";
import type { RouterOutputs } from "@/lib/trpc";
import { Loader2, Printer, Settings2 } from "lucide-react";

type CurrentPrinter = RouterOutputs["printWorkspace"]["read"]["getCurrentPrinter"];

function printerStateToHealthTone(
  state: string
): "ok" | "warn" | "bad" | "muted" {
  switch (state) {
    case "ready":
      return "ok";
    case "busy":
    case "paper_out":
    case "not_configured":
      return "warn";
    case "offline":
    case "driver_error":
      return "bad";
    default:
      return "muted";
  }
}

export function CurrentPrinterCard({
  language,
  current,
  isLoading,
  isTesting,
  connectorOnline,
  onChangePrinter,
  onTestPrint,
  onOpenManagement,
}: {
  language: string;
  current: CurrentPrinter | undefined;
  isLoading: boolean;
  isTesting: boolean;
  connectorOnline: boolean;
  onChangePrinter: () => void;
  onTestPrint: () => void;
  onOpenManagement: () => void;
}) {
  const isAr = language === "ar";

  if (isLoading) {
    return (
      <div className="flex justify-center rounded-xl border border-slate-800 bg-slate-900/40 py-8">
        <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
      </div>
    );
  }

  const printerState = derivePrinterOperationalState(current, connectorOnline);
  const stateLabel = printerStateLabel(printerState, language);
  const guidance = printerStateGuidance(printerState, language);
  const displayName = current?.printer?.displayName;
  const canTest = printerState === "ready" && connectorOnline;

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-primary/10 p-2.5 text-primary">
          <Printer className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-base font-semibold text-white">
            {displayName ?? (isAr ? "الطابعة الحالية" : "Current printer")}
          </p>
          <div className="mt-1.5">
            <SemanticBadge
              tone={mapHealthToneToBadgeTone(
                printerStateToHealthTone(printerState)
              )}
              density="soft"
              size="sm"
            >
              {stateLabel}
            </SemanticBadge>
          </div>
          {guidance ? (
            <p className="mt-2 text-sm leading-relaxed text-slate-400">{guidance}</p>
          ) : null}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant={printerState === "ready" ? "default" : "outline"}
          onClick={
            printerState === "not_configured" ? onChangePrinter : onTestPrint
          }
          disabled={
            printerState === "not_configured"
              ? !connectorOnline
              : isTesting || !canTest
          }
        >
          {isTesting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : printerState === "not_configured" ? (
            isAr ? (
              "إعداد الطابعة"
            ) : (
              "Setup printer"
            )
          ) : isAr ? (
            "طباعة صفحة اختبار"
          ) : (
            "Print test page"
          )}
        </Button>
        {printerState !== "not_configured" ? (
          <Button type="button" size="sm" variant="ghost" onClick={onOpenManagement}>
            <Settings2 className="h-4 w-4 me-1" />
            {isAr ? "إعدادات الطابعة" : "Printer settings"}
          </Button>
        ) : (
          <Button type="button" size="sm" variant="ghost" onClick={onChangePrinter}>
            {isAr ? "اختيار طابعة" : "Choose printer"}
          </Button>
        )}
      </div>
    </div>
  );
}
