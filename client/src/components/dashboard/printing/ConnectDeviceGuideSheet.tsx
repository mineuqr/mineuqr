import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { RouterOutputs } from "@/lib/trpc";
import { Check, Copy, RefreshCw } from "lucide-react";
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

  const configText = useMemo(() => {
    if (!provisioning?.connectConfig) {
      return "";
    }
    return JSON.stringify(provisioning.connectConfig, null, 2);
  }, [provisioning?.connectConfig]);

  const steps = isAr
    ? [
        "انسخ معرف الجهاز وملف الإعدادات أدناه",
        "احفظ الملف على جهاز نقطة البيع (مثال: C:\\mineuqr\\agent\\config\\production.json)",
        "عدّل اسم الطابعة في Windows ليطابق الطابعة الفعلية إن لزم",
        "شغّل سكربت التثبيت كمسؤول: scripts\\windows\\install-print-agent-service.ps1",
        "ارجع هنا واضغط تحديث للتحقق من الاتصال",
      ]
    : [
        "Copy the device ID and configuration file below",
        "Save the file on your POS computer (e.g. C:\\mineuqr\\agent\\config\\production.json)",
        "Update the Windows printer name in the file if it differs from your device",
        "Run the install script as Administrator: scripts\\windows\\install-print-agent-service.ps1",
        "Return here and press Refresh to verify the connection",
      ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side={isAr ? "left" : "right"} className="overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{isAr ? "ربط جهاز الطباعة" : "Connect Print Device"}</SheetTitle>
          <SheetDescription>
            {isAr
              ? "ثبت خدمة الطباعة على جهاز نقطة البيع باستخدام الإعدادات التالية"
              : "Install the print service on your POS device using the settings below"}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-5 text-sm">
          <div className="space-y-2">
            <p className="font-medium">{isAr ? "معرف الجهاز" : "Device ID"}</p>
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
            <p className="font-medium">{isAr ? "ملف الإعدادات" : "Configuration File"}</p>
            <pre className="max-h-64 overflow-auto rounded-lg border border-border/40 bg-muted/20 p-3 text-xs">
              {configText || (isAr ? "لا توجد طابعات مهيأة بعد" : "No printers configured yet")}
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
