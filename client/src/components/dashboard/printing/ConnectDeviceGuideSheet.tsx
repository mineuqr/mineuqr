import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { downloadAgentConfigFile } from "@/lib/printing/downloadAgentConfigFile";
import type { RouterOutputs } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { Check, ChevronDown, Copy, Download, RefreshCw } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

type Provisioning = RouterOutputs["printOps"]["getDiscoveryDiagnostics"]["provisioning"];

async function copyText(value: string, isAr: boolean) {
  try {
    await navigator.clipboard.writeText(value);
    toast.success(isAr ? "تم النسخ" : "Copied");
  } catch {
    toast.error(isAr ? "تعذر النسخ" : "Copy failed");
  }
}

export function ConnectDeviceGuideSheet({
  open,
  onOpenChange,
  provisioning,
  isAr,
  onRefresh,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  provisioning: Provisioning | undefined;
  isAr: boolean;
  onRefresh: () => void;
}) {
  const [copiedAgent, setCopiedAgent] = useState(false);
  const [copiedConfig, setCopiedConfig] = useState(false);

  const connectConfig = provisioning?.connectConfig;
  const hasConnectConfig = connectConfig != null;

  const configText = useMemo(() => {
    if (!connectConfig) {
      return "";
    }
    return JSON.stringify(connectConfig, null, 2);
  }, [connectConfig]);

  const advancedLabel = isAr
    ? "متقدم · دعم · تفاصيل تقنية"
    : "Advanced · Support · Technical Details";

  const steps = isAr
    ? [
        "حمّل ملف الإعدادات أدناه (mineuqr-agent-config.json)",
        "انقل الملف إلى جهاز نقطة البيع إن لزم",
        "ثبّت خدمة الطباعة وحدّد ملف الإعدادات عند الطلب",
        "تأكد من توصيل الطابعة وتشغيلها في Windows",
        "ارجع هنا واضغط تحديث للتحقق من الاتصال",
      ]
    : [
        "Download the configuration file below (mineuqr-agent-config.json)",
        "Move the file to your POS computer if needed",
        "Install the print service and select the configuration file when prompted",
        "Ensure your thermal printer is connected and visible in Windows",
        "Return here and press Refresh to verify the connection",
      ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side={isAr ? "left" : "right"} className="overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{isAr ? "ربط جهاز الطباعة" : "Connect Print Device"}</SheetTitle>
          <SheetDescription>
            {isAr
              ? "حمّل ملف الإعدادات وثبّت خدمة الطباعة على جهاز نقطة البيع"
              : "Download your configuration file and install the print service on your POS device"}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-5 text-sm">
          <div className="space-y-2">
            <p className="font-medium">{isAr ? "ملف الإعدادات" : "Configuration File"}</p>
            <p className="text-xs text-muted-foreground">
              {isAr
                ? "يحفظ الملف باسم mineuqr-agent-config.json"
                : "Saves as mineuqr-agent-config.json"}
            </p>
            <Button
              type="button"
              className="w-full"
              disabled={!hasConnectConfig}
              onClick={() => {
                if (!connectConfig) return;
                downloadAgentConfigFile(connectConfig);
                toast.success(isAr ? "اكتمل التحميل" : "Download complete");
              }}
            >
              <Download className="h-4 w-4" />
              <span className="ms-2">
                {isAr ? "تحميل ملف الإعدادات" : "Download Configuration"}
              </span>
            </Button>
            {!hasConnectConfig ? (
              <p className="text-xs text-muted-foreground">
                {isAr ? "لا توجد طابعات مهيأة بعد" : "No printers configured yet"}
              </p>
            ) : null}
          </div>

          <Collapsible defaultOpen={false} className="rounded-lg border border-border/40">
            <CollapsibleTrigger
              className={cn(
                "flex w-full items-center justify-between gap-2 px-3 py-2.5 text-start",
                "font-medium hover:bg-muted/30"
              )}
            >
              <span>{advancedLabel}</span>
              <ChevronDown className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 border-t border-border/40 px-3 py-3">
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">
                  {isAr ? "معرف الجهاز" : "Device ID"}
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 rounded-lg border border-border/40 bg-muted/30 px-3 py-2 text-xs">
                    {provisioning?.suggestedAgentId ?? "—"}
                  </code>
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    onClick={async () => {
                      if (!provisioning?.suggestedAgentId) return;
                      await copyText(provisioning.suggestedAgentId, isAr);
                      setCopiedAgent(true);
                      setTimeout(() => setCopiedAgent(false), 1500);
                    }}
                  >
                    {copiedAgent ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">
                  {isAr ? "JSON الخام" : "Raw JSON"}
                </p>
                <pre
                  dir="ltr"
                  className="max-h-64 overflow-auto rounded-lg border border-border/40 bg-muted/20 p-3 text-xs"
                >
                  {configText || (isAr ? "لا توجد إعدادات" : "No configuration")}
                </pre>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!configText}
                  onClick={async () => {
                    await copyText(configText, isAr);
                    setCopiedConfig(true);
                    setTimeout(() => setCopiedConfig(false), 1500);
                  }}
                >
                  {copiedConfig ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  <span className="ms-2">{isAr ? "نسخ الإعدادات" : "Copy Configuration"}</span>
                </Button>
              </div>
            </CollapsibleContent>
          </Collapsible>

          <div className="space-y-2">
            <p className="font-medium">{isAr ? "خطوات التثبيت" : "Install Steps"}</p>
            <ol className="list-decimal space-y-2 ps-5 text-muted-foreground">
              {steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </div>

          <Button type="button" className="w-full" variant="secondary" onClick={onRefresh}>
            <RefreshCw className="h-4 w-4" />
            <span className="ms-2">{isAr ? "تحديث حالة الاتصال" : "Refresh Connection Status"}</span>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
