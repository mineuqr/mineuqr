import type { FleetScreenManageAction } from "@/components/screen-management/FleetScreenCard";
import {
  ScreenOnboardingFields,
  ScreenOnboardingOptionalQr,
} from "@/components/screen-management/ScreenOnboardingFields";
import { Button } from "@/components/ui/button";
import { getScreenEntryUrl } from "@/lib/screen-credential-lifecycle/screenEntryUrl";
import { screenOnboardingCopy } from "@/lib/operational-screen/pairing/pairingPresentation";
import { trpc } from "@/lib/trpc";
import { ExternalLink, Loader2, RefreshCw, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

export function ScreenAccessTabPanel({
  screenId,
  displayName: _displayName,
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
  const copy = screenOnboardingCopy(language);
  const [knownPairingCode, setKnownPairingCode] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmRegenerate, setConfirmRegenerate] = useState(false);

  const utils = trpc.useUtils();
  const recoveryQuery = trpc.operationalDevice.management.getScreenCredential.useQuery(
    { restaurantId, deviceId: screenId },
    { enabled }
  );

  const regenerateMutation = trpc.operationalDevice.management.regenerateCredential.useMutation({
    onSuccess: (result) => {
      setConfirmRegenerate(false);
      setKnownPairingCode(result.pairingCode);
      void recoveryQuery.refetch();
      void utils.operationalDevice.fleet.queryScreens.invalidate();
    },
  });

  const deleteMutation = trpc.operationalDevice.management.deleteScreen.useMutation({
    onSuccess: () => {
      setConfirmDelete(false);
      setKnownPairingCode(null);
      void utils.operationalDevice.fleet.queryScreens.invalidate();
      void utils.operationalDevice.fleet.getKpis.invalidate({ restaurantId });
      onDeleted?.();
    },
  });

  useEffect(() => {
    if (!enabled) {
      setKnownPairingCode(null);
      setConfirmDelete(false);
      setConfirmRegenerate(false);
      return;
    }
    if (!initialFocus) return;
    setConfirmRegenerate(initialFocus === "regenerate");
    setConfirmDelete(initialFocus === "delete");
  }, [enabled, initialFocus]);

  const screenEntryUrl = getScreenEntryUrl();
  const recovery = recoveryQuery.data;
  const retrievable = recovery && "retrievable" in recovery && recovery.retrievable === true;
  const hasUnredeemedPairingCode =
    recovery && "pairing" in recovery && recovery.pairing?.hasUnredeemedPairingCode === true;

  return (
    <div className="space-y-6 pb-4">
      <div className="space-y-3">
        <p className="text-sm font-medium">{isAr ? "فتح الشاشة" : "Open screen"}</p>
        <p className="text-sm text-muted-foreground">{copy.openScreenHelper}</p>
        <Button size="sm" asChild>
          <a href={screenEntryUrl} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="mr-1 h-4 w-4" />
            {isAr ? "فتح الشاشة" : "Open screen"}
          </a>
        </Button>
      </div>

      {recoveryQuery.isLoading ? (
        <div className="flex justify-center py-8" role="status" aria-live="polite">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : null}

      {recovery && "retrievable" in recovery && recovery.retrievable === false ? (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-4 text-sm">
          <p className="font-medium">{isAr ? "إعداد قديم" : "Legacy setup"}</p>
          <p className="mt-1 text-muted-foreground">
            {isAr
              ? "أعد توليد الاعتماد للحصول على رمز ربط جديد. الأجهزة المربوطة مسبقاً تستمر بالعمل."
              : "Regenerate credential to get a new pairing code. Already-paired devices keep working."}
          </p>
        </div>
      ) : null}

      <ScreenOnboardingFields
        screenLink={screenEntryUrl}
        pairingCode={knownPairingCode}
        language={language}
        pairingCodeHelper={
          hasUnredeemedPairingCode && !knownPairingCode
            ? copy.pairingCodePending
            : null
        }
      />

      {retrievable && recovery.recoveryQrSvg ? (
        <ScreenOnboardingOptionalQr recoveryQrSvg={recovery.recoveryQrSvg} language={language} />
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
            {isAr ? "إعادة توليد الاعتماد" : "Regenerate Credential"}
          </Button>
        ) : (
          <div className="space-y-2 rounded-xl border border-amber-500/40 bg-amber-500/5 p-4">
            <p className="text-sm">
              {isAr
                ? "سيُلغى الوصول الحالي على أي جهاز فتح هذه الشاشة. افتح الرابط على الجهاز وأدخل رمز الربط الجديد."
                : "Current access will stop on any device using this screen. Open the screen link on each device and enter the new pairing code."}
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
                ? "ستُزال هذه الشاشة من الأسطول. أي جهاز يستخدمها سيتوقف ويجب إعداد شاشة من جديد."
                : "This screen will be removed from your fleet. Any device using it will stop and must set up again."}
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
