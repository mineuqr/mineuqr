import type { ProvisioningHealth } from "@/lib/screen-provisioning/provisioningSessionContract";
import { getScreenEntryUrl } from "@/lib/screen-credential-lifecycle/screenEntryUrl";
import {
  ScreenOnboardingFields,
  ScreenOnboardingOptionalQr,
} from "@/components/screen-management/ScreenOnboardingFields";

/** Primary provisioning onboarding — screen link + pairing code. */
export function ProvisioningActivationPanel({
  credentials,
  health,
  language,
}: {
  credentials: {
    pairingCode: string;
    recoveryQrSvg: string;
  };
  health: ProvisioningHealth | null;
  language: string;
}) {
  const isAr = language === "ar";
  const screenUrl = getScreenEntryUrl();
  const minutesRemaining = health ? Math.max(0, Math.ceil(health.secondsRemaining / 60)) : null;

  return (
    <div className="mt-6 space-y-6 rounded-2xl border border-border/40 bg-muted/10 p-6">
      <div className="space-y-1 text-center sm:text-start">
        <h3 className="text-lg font-semibold">{isAr ? "افتح الشاشة على الجهاز" : "Open screen on device"}</h3>
        <p className="text-sm text-muted-foreground">
          {isAr
            ? "افتح رابط الشاشة على الجهاز وأدخل رمز الربط."
            : "Open the screen link on your device and enter the pairing code."}
        </p>
      </div>

      <ScreenOnboardingFields
        screenLink={screenUrl}
        pairingCode={credentials.pairingCode}
        language={language}
      />

      <ScreenOnboardingOptionalQr recoveryQrSvg={credentials.recoveryQrSvg} language={language} />

      {minutesRemaining != null ? (
        <p className="text-center text-xs text-muted-foreground sm:text-start">
          {isAr
            ? `الوقت المتبقي لإكمال الإعداد: ${minutesRemaining} دقيقة`
            : `Time remaining to finish setup: ${minutesRemaining} min`}
        </p>
      ) : null}
    </div>
  );
}
