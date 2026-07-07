import { Check, Copy } from "lucide-react";
import { useState } from "react";
import type { ProvisioningHealth } from "@/lib/screen-provisioning/provisioningSessionContract";
import { getDeviceActivationUrl } from "@/lib/device-activation/deviceActivationUrl";
import { Button } from "@/components/ui/button";
import { ProvisioningOptionalQrPanel } from "./ProvisioningOptionalQrPanel";

function CopyField({
  label,
  value,
  copyLabel,
  copiedLabel,
  prominent,
}: {
  label: string;
  value: string;
  copyLabel: string;
  copiedLabel: string;
  prominent?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const onCopy = () => {
    void navigator.clipboard?.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <div className="w-full space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <button
          type="button"
          onClick={onCopy}
          className="flex items-center gap-1 text-xs text-primary hover:underline"
        >
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          {copied ? copiedLabel : copyLabel}
        </button>
      </div>
      <p
        className={
          prominent
            ? "rounded-xl border border-primary/30 bg-primary/5 p-4 text-center font-mono text-2xl font-semibold tracking-[0.2em]"
            : "w-full break-all rounded-lg bg-muted p-3 font-mono text-sm"
        }
      >
        {value}
      </p>
    </div>
  );
}

/** Primary provisioning onboarding — URL + activation code; QR optional. */
export function ProvisioningActivationPanel({
  activationCode,
  credentials,
  health,
  language,
}: {
  activationCode: string;
  credentials: {
    deviceId: string;
    tokenId: string;
    secret: string;
    qrPayload: Record<string, unknown>;
  };
  health: ProvisioningHealth | null;
  language: string;
}) {
  const isAr = language === "ar";
  const deviceUrl = getDeviceActivationUrl();
  const copyLabel = isAr ? "نسخ" : "Copy";
  const copiedLabel = isAr ? "تم النسخ" : "Copied";
  const minutesRemaining = health ? Math.max(0, Math.ceil(health.secondsRemaining / 60)) : null;

  return (
    <div className="mt-6 space-y-6 rounded-2xl border border-border/40 bg-muted/10 p-6">
      <div className="space-y-1 text-center sm:text-start">
        <h3 className="text-lg font-semibold">
          {isAr ? "تجهيز الشاشة" : "Provision screen"}
        </h3>
        <p className="text-sm text-muted-foreground">
          {isAr
            ? "افتح الرابط التالي على الجهاز وأدخل رمز التفعيل. لا حاجة لكاميرا."
            : "Open the following link on the device and enter the activation code. No camera required."}
        </p>
      </div>

      <CopyField
        label={isAr ? "رابط الجهاز" : "Device URL"}
        value={deviceUrl}
        copyLabel={copyLabel}
        copiedLabel={copiedLabel}
      />

      <CopyField
        label={isAr ? "رمز التفعيل" : "Activation code"}
        value={activationCode}
        copyLabel={copyLabel}
        copiedLabel={copiedLabel}
        prominent
      />

      {minutesRemaining != null ? (
        <p className="text-center text-xs text-muted-foreground sm:text-start">
          {isAr
            ? `الوقت المتبقي للجلسة: ${minutesRemaining} دقيقة`
            : `Session time remaining: ${minutesRemaining} min`}
        </p>
      ) : null}

      <ProvisioningOptionalQrPanel credentials={credentials} language={language} />
    </div>
  );
}
