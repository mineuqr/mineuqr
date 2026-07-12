import { Check, Copy } from "lucide-react";
import { useState } from "react";
import type { ProvisioningHealth } from "@/lib/screen-provisioning/provisioningSessionContract";
import { getScreenEntryUrl } from "@/lib/screen-credential-lifecycle/screenEntryUrl";

function CopyField({
  label,
  value,
  copyLabel,
  copiedLabel,
}: {
  label: string;
  value: string;
  copyLabel: string;
  copiedLabel: string;
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
      <p className="w-full break-all rounded-lg bg-muted p-3 font-mono text-sm">{value}</p>
    </div>
  );
}

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
  const copyLabel = isAr ? "نسخ" : "Copy";
  const copiedLabel = isAr ? "تم النسخ" : "Copied";
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

      <CopyField
        label={isAr ? "رابط الشاشة" : "Screen link"}
        value={screenUrl}
        copyLabel={copyLabel}
        copiedLabel={copiedLabel}
      />

      <CopyField
        label={isAr ? "رمز الربط" : "Pairing code"}
        value={credentials.pairingCode}
        copyLabel={copyLabel}
        copiedLabel={copiedLabel}
      />

      <details className="rounded-lg border border-border/30 bg-muted/5 p-4">
        <summary className="cursor-pointer text-sm font-medium text-muted-foreground">
          {isAr ? "رمز QR (اختياري)" : "QR code (optional)"}
        </summary>
        <div className="mt-4 flex flex-col items-center gap-3">
          <div
            className="rounded-xl border bg-white p-4 [&>svg]:block"
            dangerouslySetInnerHTML={{ __html: credentials.recoveryQrSvg }}
          />
          <p className="max-w-sm text-center text-xs text-muted-foreground">
            {isAr
              ? "رمز QR للتوافق — الطريقة الأساسية هي رمز الربط."
              : "QR for compatibility — pairing code is the primary method."}
          </p>
        </div>
      </details>

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
