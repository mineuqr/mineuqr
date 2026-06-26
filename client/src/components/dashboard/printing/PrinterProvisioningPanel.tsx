import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  authoritySetupWizardStep,
  authorityStepLabel,
  canRunAuthorityTestPrint,
  shouldOfferAddPrinterAction,
  shouldOfferConnectDeviceAction,
  type PrintingSetupStatus,
} from "@/lib/printing/printingReadinessAuthority";
import { Loader2, Plus, Smartphone, TestTube2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

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

function operationalBadge(
  status: PrintingSetupStatus,
  isAr: boolean
): { label: string; variant: "default" | "secondary" | "destructive" | "outline" } {
  switch (status.operationalState) {
    case "DEGRADED":
      return {
        label: isAr ? "تشغيل متدهور" : "Degraded",
        variant: "outline",
      };
    case "BLOCKED":
      return {
        label: isAr ? "محظور" : "Blocked",
        variant: "destructive",
      };
    default:
      return {
        label: isAr ? "سليم" : "Healthy",
        variant: status.setupState === "READY" ? "default" : "secondary",
      };
  }
}

export function PrinterProvisioningPanel({
  setupStatus,
  isAr,
  isLoading,
  testPrintPending,
  onAddPrinter,
  onConnectDevice,
  onTestPrint,
}: {
  setupStatus: PrintingSetupStatus | undefined;
  isAr: boolean;
  isLoading: boolean;
  testPrintPending: boolean;
  onAddPrinter: () => void;
  onConnectDevice: () => void;
  onTestPrint: () => void;
}) {
  if (isLoading || !setupStatus) {
    return (
      <Card className="border-border/40 bg-card/40">
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const stepIndex = authoritySetupWizardStep(setupStatus);
  const operational = operationalBadge(setupStatus, isAr);

  return (
    <Card className="border-primary/20 bg-card/50">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base">
            {isAr ? "إعداد الطباعة" : "Printing Setup"}
          </CardTitle>
          <Badge variant={operational.variant}>{operational.label}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <StepPill
            label={isAr ? "1. إضافة طابعة" : "1. Add Printer"}
            active={stepIndex === 1}
            complete={setupStatus.checklist.printerCreated}
          />
          <StepPill
            label={isAr ? "2. ربط الجهاز" : "2. Connect Device"}
            active={stepIndex === 2}
            complete={setupStatus.checklist.agentConnected && setupStatus.checklist.printerBound}
          />
          <StepPill
            label={isAr ? "3. اختبار الطباعة" : "3. Test Print"}
            active={stepIndex === 3 && !setupStatus.checklist.testPrintPassed}
            complete={setupStatus.checklist.testPrintPassed}
          />
        </div>

        <div className="space-y-1">
          <p className="font-medium text-foreground">{authorityStepLabel(setupStatus, isAr)}</p>
          <p className="text-sm text-muted-foreground">{setupStatus.reason}</p>
        </div>

        {shouldOfferAddPrinterAction(setupStatus) ? (
          <Button type="button" onClick={onAddPrinter}>
            <Plus className="h-4 w-4" />
            <span className="ms-2">{isAr ? "إضافة طابعة" : "Add Printer"}</span>
          </Button>
        ) : null}

        {shouldOfferConnectDeviceAction(setupStatus) ? (
          <Button type="button" onClick={onConnectDevice}>
            <Smartphone className="h-4 w-4" />
            <span className="ms-2">{isAr ? "ربط الجهاز" : "Connect Device"}</span>
          </Button>
        ) : null}

        {canRunAuthorityTestPrint(setupStatus) ? (
          <Button type="button" disabled={testPrintPending} onClick={onTestPrint}>
            {testPrintPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <TestTube2 className="h-4 w-4" />
            )}
            <span className="ms-2">
              {isAr ? "طباعة تجريبية" : "Test Print"}
              {setupStatus.primaryPrinter?.name ? ` · ${setupStatus.primaryPrinter.name}` : ""}
            </span>
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
