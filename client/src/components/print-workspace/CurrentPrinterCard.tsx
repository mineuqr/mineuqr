import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { RouterOutputs } from "@/lib/trpc";
import { Loader2, Printer, Settings2 } from "lucide-react";

type CurrentPrinter = RouterOutputs["printWorkspace"]["read"]["getCurrentPrinter"];

export function CurrentPrinterCard({
  language,
  current,
  isLoading,
  isTesting,
  onChangePrinter,
  onTestPrint,
  onOpenManagement,
}: {
  language: string;
  current: CurrentPrinter | undefined;
  isLoading: boolean;
  isTesting: boolean;
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
        <div className="mt-3 flex flex-wrap gap-2">
          <Button type="button" size="sm" onClick={onChangePrinter}>
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
  const isReady = status?.isReady ?? status?.isOnline ?? true;

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-primary/10 p-2 text-primary">
            <Printer className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold text-white">{printer.displayName}</p>
            <p className="text-xs text-slate-400">
              {printer.transport} · {printer.platform}
            </p>
            <p className="mt-1 text-xs">
              <span
                className={cn(
                  "font-medium",
                  isReady ? "text-emerald-400" : "text-red-400"
                )}
              >
                {isReady ? (isAr ? "جاهزة" : "Ready") : isAr ? "غير جاهزة" : "Not ready"}
              </span>
              {printer.isDefault ? (
                <span className="ms-2 text-slate-500">· {isAr ? "افتراضية" : "Default"}</span>
              ) : null}
            </p>
            {current.lastValidatedAt ? (
              <p className="mt-1 text-xs text-slate-500">
                {isAr ? "آخر تحقق: " : "Last validated: "}
                {current.lastValidatedAt}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="outline" onClick={onChangePrinter}>
          {isAr ? "تغيير الطابعة" : "Change printer"}
        </Button>
        <Button type="button" size="sm" variant="outline" disabled={isTesting} onClick={onTestPrint}>
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
