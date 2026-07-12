import type { FleetScreenManageAction } from "@/components/screen-management/FleetScreenCard";
import {
  CopyButton,
  ServerRecoveryQr,
} from "@/components/screen-management/screenAccessPresentation";
import { Button } from "@/components/ui/button";
import {
  getScreenEntryUrl,
  getScreenLoginUrl,
} from "@/lib/screen-credential-lifecycle/screenEntryUrl";
import { trpc } from "@/lib/trpc";
import { ExternalLink, Loader2, QrCode, RefreshCw, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

export function ScreenAccessTabPanel({
  screenId,
  displayName,
  restaurantId,
  language,
  enabled,
  initialFocus = null,
  onDeleted,
}: {
  screenId: string;
  displayName: string;
  restaurantId: number;
  language: string;
  enabled: boolean;
  initialFocus?: FleetScreenManageAction | null;
  onDeleted?: () => void;
}) {
  const isAr = language === "ar";
  const [showQr, setShowQr] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmRegenerate, setConfirmRegenerate] = useState(false);

  const utils = trpc.useUtils();
  const recoveryQuery = trpc.operationalDevice.management.getScreenCredential.useQuery(
    { restaurantId, deviceId: screenId },
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
      void utils.operationalDevice.fleet.queryScreens.invalidate();
      void utils.operationalDevice.fleet.getKpis.invalidate({ restaurantId });
      onDeleted?.();
    },
  });

  useEffect(() => {
    if (!enabled) {
      setShowQr(false);
      setConfirmDelete(false);
      setConfirmRegenerate(false);
      return;
    }
    if (!initialFocus) return;
    setShowQr(initialFocus === "show_qr");
    setConfirmRegenerate(initialFocus === "regenerate");
    setConfirmDelete(initialFocus === "delete");
  }, [enabled, initialFocus]);

  const screenEntryUrl = getScreenEntryUrl();
  const screenSetupUrl = getScreenLoginUrl();
  const recovery = recoveryQuery.data;
  const retrievable = recovery && "retrievable" in recovery && recovery.retrievable === true;

  return (
    <div className="space-y-6 pb-4">
      <div className="space-y-3">
        <p className="text-sm font-medium">{isAr ? "فتح الشاشة" : "Open screen"}</p>
        <p className="text-xs text-muted-foreground">
          {isAr
            ? "افتح الشاشة على الجهاز. بعد الإعداد الأول، يعود الجهاز تلقائياً عند فتح الرابط."
            : "Open the screen on your device. After the first setup, the device resumes automatically when you open the link."}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" asChild>
            <a href={screenEntryUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-1 h-4 w-4" />
              {isAr ? "فتح الشاشة" : "Open screen"}
            </a>
          </Button>
          <CopyButton value={screenEntryUrl} label={isAr ? "نسخ الرابط" : "Copy link"} />
          <CopyButton value={screenSetupUrl} label={isAr ? "نسخ رابط الإعداد" : "Copy setup link"} />
        </div>
      </div>

      {recoveryQuery.isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : null}

      {recovery && "retrievable" in recovery && recovery.retrievable === false ? (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-4 text-sm">
          <p className="font-medium">{isAr ? "وصول قديم" : "Legacy access"}</p>
          <p className="mt-1 text-muted-foreground">
            {isAr
              ? "لا يمكن عرض QR حتى إعادة توليد الاعتماد. الأجهزة المربوطة مسبقاً تستمر بالعمل."
              : "QR cannot be shown until you Regenerate Credential. Already-paired devices keep working."}
          </p>
        </div>
      ) : null}

      {retrievable ? (
        <div className="space-y-3">
          <p className="text-sm font-medium">{isAr ? "QR للشاشة" : "Screen QR"}</p>
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

      <div className="space-y-3 rounded-xl border bg-muted/20 p-4 text-sm">
        <p className="font-medium">{isAr ? "ملخص الاعتماد" : "Credential summary"}</p>
        <dl className="space-y-2 text-xs">
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">{isAr ? "حالة الوصول" : "Access status"}</dt>
            <dd>
              {retrievable
                ? isAr
                  ? "QR متاح"
                  : "QR available"
                : isAr
                  ? "QR غير متاح"
                  : "QR unavailable"}
            </dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">{isAr ? "رابط الشاشة" : "Screen link"}</dt>
            <dd className="max-w-[55%] truncate font-mono">{screenEntryUrl}</dd>
          </div>
        </dl>
      </div>

      <div className="space-y-3 border-t pt-4">
        {!confirmRegenerate ? (
          <Button
            variant="outline"
            className="w-full"
            disabled={regenerateMutation.isPending}
            onClick={() => setConfirmRegenerate(true)}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            {isAr ? "إعادة توليد الاعتماد" : "Regenerate Credential"}
          </Button>
        ) : (
          <div className="space-y-2 rounded-xl border border-amber-500/40 bg-amber-500/5 p-4">
            <p className="text-sm">
              {isAr
                ? "سيُلغى الوصول الحالي على أي جهاز فتح هذه الشاشة. افتح الشاشة من جديد على كل جهاز باستخدام QR أو رابط الإعداد الجديد."
                : "Current access will be cancelled on any device that already opened this screen. Open the screen again on each device using the new QR code or setup link."}
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                disabled={regenerateMutation.isPending}
                onClick={() => regenerateMutation.mutate({ restaurantId, deviceId: screenId })}
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
            {isAr ? "حذف الشاشة" : "Delete Screen"}
          </Button>
        ) : (
          <div className="space-y-2 rounded-xl border border-destructive/40 bg-destructive/5 p-4">
            <p className="text-sm">
              {isAr
                ? "ستُزال هذه الشاشة من الأسطول ويُلغى كل الوصول. أي جهاز يستخدمها سيتوقف ويجب إعداد شاشة من جديد."
                : "This screen will be removed from your fleet and all access cancelled. Any device using it will stop working and must set up again."}
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="destructive"
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate({ restaurantId, deviceId: screenId })}
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
  );
}
