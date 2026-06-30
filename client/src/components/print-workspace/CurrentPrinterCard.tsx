import { Button } from "@/components/ui/button";
import type { RouterOutputs } from "@/lib/trpc";
import { Loader2, Printer, Settings2 } from "lucide-react";

type CurrentPrinter = RouterOutputs["printWorkspace"]["read"]["getCurrentPrinter"];

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-sm text-slate-200">{value}</p>
    </div>
  );
}

function capabilitySummary(
  capabilities: NonNullable<CurrentPrinter["printer"]>["capabilities"],
  isAr: boolean
): string {
  if (!capabilities) return isAr ? "—" : "—";
  const parts: string[] = [];
  if (capabilities.supportsRawText) parts.push(isAr ? "نص" : "Raw text");
  if (capabilities.supportsCut) parts.push(isAr ? "قص" : "Cut");
  if (capabilities.paperWidthMm) parts.push(`${capabilities.paperWidthMm}mm`);
  return parts.length > 0 ? parts.join(" · ") : isAr ? "قياسية" : "Standard";
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

  if (!current?.configured || !current.printer) {
    return (
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
        <p className="text-sm text-amber-100/90">
          {isAr ? "لم يتم إعداد طابعة بعد." : "No printer configured yet."}
        </p>
        {!connectorOnline ? (
          <p className="mt-2 text-xs text-amber-200/80">
            {isAr
              ? "موصل المطعم غير متصل — سجّل الطابعة عندما يعود الموصل."
              : "Restaurant connector is offline — configure when the connector is available."}
          </p>
        ) : null}
        <div className="mt-3 flex flex-wrap gap-2">
          <Button type="button" size="sm" onClick={onChangePrinter} disabled={!connectorOnline}>
            {isAr ? "إضافة طابعة" : "Add printer"}
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={onOpenManagement}>
            <Settings2 className="h-4 w-4 me-1" />
            {isAr ? "إدارة الطابعات" : "Management"}
          </Button>
        </div>
      </div>
    );
  }

  const { printer, status } = current;
  const isOnline = status?.isOnline ?? false;
  const isReady = status?.isReady ?? false;
  const caps = printer.capabilities;

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-primary/10 p-2 text-primary">
          <Printer className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-white">{printer.displayName}</p>
          <p className="text-xs text-slate-400">
            {isAr ? "الطابعة الحالية للمطعم" : "Restaurant default printer"}
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label={isAr ? "الاسم" : "Printer name"} value={printer.displayName} />
        <Field label={isAr ? "المحرك" : "Driver"} value={printer.platform} />
        <Field label={isAr ? "المنصة" : "Platform"} value={printer.platform} />
        <Field
          label={isAr ? "عرض الورق" : "Paper width"}
          value={caps?.paperWidthMm ? `${caps.paperWidthMm} mm` : isAr ? "—" : "—"}
        />
        <Field
          label={isAr ? "متصل" : "Online"}
          value={isOnline ? (isAr ? "نعم" : "Yes") : isAr ? "لا" : "No"}
        />
        <Field
          label={isAr ? "جاهزة" : "Ready"}
          value={isReady ? (isAr ? "نعم" : "Yes") : isAr ? "لا" : "No"}
        />
        <Field
          label={isAr ? "افتراضية" : "Default printer"}
          value={printer.isDefault ? (isAr ? "نعم" : "Yes") : isAr ? "لا" : "No"}
        />
        <Field
          label={isAr ? "القدرات" : "Capabilities"}
          value={capabilitySummary(caps, isAr)}
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={onChangePrinter}
          disabled={!connectorOnline}
        >
          {isAr ? "تغيير الطابعة" : "Change printer"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={isTesting || !connectorOnline || !isReady}
          onClick={onTestPrint}
        >
          {isTesting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isAr ? (
            "طباعة تجريبية"
          ) : (
            "Test print"
          )}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onOpenManagement}>
          <Settings2 className="h-4 w-4 me-1" />
          {isAr ? "إدارة" : "Management"}
        </Button>
      </div>
    </div>
  );
}
