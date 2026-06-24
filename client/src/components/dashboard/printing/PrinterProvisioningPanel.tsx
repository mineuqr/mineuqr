import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { RouterOutputs } from "@/lib/trpc";
import { Loader2, Plus, Smartphone, TestTube2 } from "lucide-react";

type Provisioning = RouterOutputs["printOps"]["getDiscoveryDiagnostics"]["provisioning"];

function stepLabel(step: Provisioning["step"], isAr: boolean): string {
  switch (step) {
    case "add_printer":
      return isAr ? "أضف طابعة" : "Add Printer";
    case "connect_agent":
      return isAr ? "اربط الجهاز" : "Connect Device";
    case "test_print":
      return isAr ? "اختبر الطباعة" : "Test Print";
    default:
      return isAr ? "يتطلب مراجعة" : "Needs Review";
  }
}

function stepDescription(step: Provisioning["step"], isAr: boolean): string {
  switch (step) {
    case "add_printer":
      return isAr
        ? "ابدأ بإضافة طابعة لهذا المطعم. سيتم إعداد المعرفات التقنية تلقائياً."
        : "Start by adding a printer for this restaurant. Technical IDs are managed automatically.";
    case "connect_agent":
      return isAr
        ? "الطابعة مُسجّلة. ثبّت خدمة الطباعة على جهاز نقطة البيع واربطها."
        : "Your printer is registered. Install the print service on your POS device to connect.";
    case "test_print":
      return isAr
        ? "الجهاز متصل. أرسل طباعة تجريبية للتأكد من أن كل شيء يعمل."
        : "Your device is connected. Send a test print to confirm everything works.";
    default:
      return isAr
        ? "يوجد تعارض في الإعداد. راجع التشخيص أدناه قبل المتابعة."
        : "There is a setup conflict. Review diagnostics below before continuing.";
  }
}

function StepPill({
  label,
  active,
  complete,
}: {
  label: string;
  active: boolean;
  complete: boolean;
}) {
  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-medium ${
        active
          ? "bg-primary text-primary-foreground"
          : complete
            ? "bg-emerald-500/15 text-emerald-300"
            : "bg-muted/40 text-muted-foreground"
      }`}
    >
      {label}
    </span>
  );
}

export function PrinterProvisioningPanel({
  provisioning,
  isAr,
  isLoading,
  testPrintPending,
  onAddPrinter,
  onConnectDevice,
  onTestPrint,
}: {
  provisioning: Provisioning | undefined;
  isAr: boolean;
  isLoading: boolean;
  testPrintPending: boolean;
  onAddPrinter: () => void;
  onConnectDevice: () => void;
  onTestPrint: () => void;
}) {
  if (isLoading || !provisioning) {
    return (
      <Card className="border-border/40 bg-card/40">
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const step = provisioning.step;
  const stepIndex = step === "add_printer" ? 1 : step === "connect_agent" ? 2 : step === "test_print" ? 3 : 0;

  return (
    <Card className="border-primary/20 bg-card/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">
          {isAr ? "إعداد الطباعة" : "Printing Setup"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <StepPill
            label={isAr ? "1. إضافة طابعة" : "1. Add Printer"}
            active={stepIndex === 1}
            complete={stepIndex > 1}
          />
          <StepPill
            label={isAr ? "2. ربط الجهاز" : "2. Connect Device"}
            active={stepIndex === 2}
            complete={stepIndex > 2}
          />
          <StepPill
            label={isAr ? "3. اختبار الطباعة" : "3. Test Print"}
            active={stepIndex === 3}
            complete={false}
          />
        </div>

        <div className="space-y-1">
          <p className="font-medium text-foreground">{stepLabel(step, isAr)}</p>
          <p className="text-sm text-muted-foreground">{stepDescription(step, isAr)}</p>
        </div>

        {step === "add_printer" ? (
          <Button type="button" onClick={onAddPrinter}>
            <Plus className="h-4 w-4" />
            <span className="ms-2">{isAr ? "إضافة طابعة" : "Add Printer"}</span>
          </Button>
        ) : null}

        {step === "connect_agent" ? (
          <Button type="button" onClick={onConnectDevice}>
            <Smartphone className="h-4 w-4" />
            <span className="ms-2">{isAr ? "ربط الجهاز" : "Connect Device"}</span>
          </Button>
        ) : null}

        {step === "test_print" && provisioning.primaryPrinterId != null ? (
          <Button type="button" disabled={testPrintPending} onClick={onTestPrint}>
            {testPrintPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <TestTube2 className="h-4 w-4" />
            )}
            <span className="ms-2">
              {isAr ? "طباعة تجريبية" : "Test Print"}
              {provisioning.primaryPrinterName ? ` · ${provisioning.primaryPrinterName}` : ""}
            </span>
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
