import { Check, Copy, Download, ExternalLink, Loader2, QrCode, RefreshCw, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  getScreenEntryUrl,
  getScreenLoginUrl,
} from "@/lib/screen-credential-lifecycle/screenEntryUrl";
import { trpc } from "@/lib/trpc";

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const onCopy = () => {
    void navigator.clipboard?.writeText(value).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <Button type="button" variant="outline" size="sm" onClick={onCopy}>
      {copied ? <Check className="mr-1 h-4 w-4" /> : <Copy className="mr-1 h-4 w-4" />}
      {copied ? "Copied" : label}
    </Button>
  );
}

function ServerRecoveryQr({
  recoveryQrSvg,
  displayName,
}: {
  recoveryQrSvg: string;
  displayName: string;
}) {
  const downloadSvg = () => {
    const blob = new Blob([recoveryQrSvg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${displayName.replace(/\s+/g, "-").toLowerCase()}-screen-qr.svg`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-3">
      <div
        className="flex justify-center rounded-xl border bg-white p-4 [&>svg]:block"
        dangerouslySetInnerHTML={{ __html: recoveryQrSvg }}
      />
      <Button type="button" size="sm" variant="outline" onClick={downloadSvg}>
        <Download className="mr-1 h-4 w-4" />
        Download QR
      </Button>
    </div>
  );
}

export function ScreenCredentialLifecycleSheet({
  open,
  onOpenChange,
  screenId,
  displayName,
  restaurantId,
  language,
  onDeleted,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  screenId: string | null;
  displayName: string;
  restaurantId: number;
  language: string;
  onDeleted?: () => void;
}) {
  const isAr = language === "ar";
  const enabled = open && screenId != null;
  const [showQr, setShowQr] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmRegenerate, setConfirmRegenerate] = useState(false);

  const utils = trpc.useUtils();
  const recoveryQuery = trpc.operationalDevice.management.getScreenCredential.useQuery(
    { restaurantId, deviceId: screenId ?? "" },
    { enabled }
  );

  const regenerateMutation = trpc.operationalDevice.management.regenerateCredential.useMutation({
    onSuccess: () => {
      setConfirmRegenerate(false);
      setShowQr(true);
      void recoveryQuery.refetch();
      void utils.operationalDevice.fleet.queryScreens.invalidate();
    },
  });

  const deleteMutation = trpc.operationalDevice.management.deleteScreen.useMutation({
    onSuccess: () => {
      setConfirmDelete(false);
      onOpenChange(false);
      void utils.operationalDevice.fleet.queryScreens.invalidate();
      void utils.operationalDevice.fleet.getKpis.invalidate({ restaurantId });
      onDeleted?.();
    },
  });

  const screenEntryUrl = getScreenEntryUrl();
  const screenLoginUrl = getScreenLoginUrl();
  const recovery = recoveryQuery.data;
  const retrievable = recovery && "retrievable" in recovery && recovery.retrievable === true;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{isAr ? "دورة حياة الشاشة" : "Screen lifecycle"}</SheetTitle>
          <SheetDescription>{displayName}</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          <div className="space-y-3">
            <p className="text-sm font-medium">{isAr ? "فتح الشاشة" : "Open screen"}</p>
            <p className="text-xs text-muted-foreground">
              {isAr
                ? "افتح رابط الشاشة على الجهاز التشغيلي. الاعتماد المخزّن محلياً يُعيد التشغيل تلقائياً."
                : "Open the screen URL on the operational device. Stored credentials resume automatically."}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" asChild>
                <a href={screenEntryUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-1 h-4 w-4" />
                  {isAr ? "فتح /screen" : "Open /screen"}
                </a>
              </Button>
              <CopyButton value={screenEntryUrl} label={isAr ? "نسخ الرابط" : "Copy link"} />
              <CopyButton value={screenLoginUrl} label={isAr ? "نسخ رابط الدخول" : "Copy login link"} />
            </div>
          </div>

          {recoveryQuery.isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : null}

          {recovery && "retrievable" in recovery && recovery.retrievable === false ? (
            <div className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-4 text-sm">
              <p className="font-medium">
                {isAr ? "اعتماد قديم" : "Legacy credential"}
              </p>
              <p className="mt-1 text-muted-foreground">
                {isAr
                  ? "لا يمكن عرض QR لهذه الشاشة حتى إعادة توليد الاعتماد. الأجهزة المربوطة مسبقاً تستمر بالعمل."
                  : "QR cannot be shown until you regenerate the credential. Already-paired devices keep working."}
              </p>
            </div>
          ) : null}

          {retrievable ? (
            <div className="space-y-3">
              <p className="text-sm font-medium">{isAr ? "استرداد QR" : "QR recovery"}</p>
              <p className="text-xs text-muted-foreground">
                {isAr
                  ? "يُولَّد QR على الخادم — لا يُعرض الاعتماد كنص في JavaScript."
                  : "QR is server-rendered — credentials are not exposed as plaintext to JavaScript."}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => setShowQr((v) => !v)}>
                  <QrCode className="mr-1 h-4 w-4" />
                  {showQr ? (isAr ? "إخفاء QR" : "Hide QR") : isAr ? "عرض QR" : "Show QR"}
                </Button>
              </div>
              {showQr ? (
                <ServerRecoveryQr recoveryQrSvg={recovery.recoveryQrSvg} displayName={displayName} />
              ) : null}
            </div>
          ) : null}

          <div className="space-y-3 border-t pt-4">
            {!confirmRegenerate ? (
              <Button
                variant="outline"
                className="w-full"
                disabled={regenerateMutation.isPending}
                onClick={() => setConfirmRegenerate(true)}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                {isAr ? "إعادة توليد الاعتماد" : "Regenerate credential"}
              </Button>
            ) : (
              <div className="space-y-2 rounded-xl border border-amber-500/40 bg-amber-500/5 p-4">
                <p className="text-sm">
                  {isAr
                    ? "سيتم إلغاء الاعتماد الحالي. يجب إدخال الاعتماد الجديد على الجهاز."
                    : "The current credential will be revoked. Enter the new credential on the device."}
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    disabled={regenerateMutation.isPending || !screenId}
                    onClick={() => screenId && regenerateMutation.mutate({ restaurantId, deviceId: screenId })}
                  >
                    {regenerateMutation.isPending ? (
                      <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                    ) : null}
                    {isAr ? "تأكيد" : "Confirm"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setConfirmRegenerate(false)}>
                    {isAr ? "إلغاء" : "Cancel"}
                  </Button>
                </div>
              </div>
            )}

            {!confirmDelete ? (
              <Button
                variant="destructive"
                className="w-full"
                disabled={deleteMutation.isPending}
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {isAr ? "حذف الشاشة" : "Delete screen"}
              </Button>
            ) : (
              <div className="space-y-2 rounded-xl border border-destructive/40 bg-destructive/5 p-4">
                <p className="text-sm">
                  {isAr
                    ? "سيتم إلغاء الاعتماد وإنهاء الجلسات النشطة وإزالة الشاشة من الأسطول."
                    : "Credentials will be revoked, active sessions terminated, and the screen removed from the fleet."}
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={deleteMutation.isPending || !screenId}
                    onClick={() => screenId && deleteMutation.mutate({ restaurantId, deviceId: screenId })}
                  >
                    {deleteMutation.isPending ? (
                      <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                    ) : null}
                    {isAr ? "حذف نهائي" : "Delete permanently"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setConfirmDelete(false)}>
                    {isAr ? "إلغاء" : "Cancel"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
