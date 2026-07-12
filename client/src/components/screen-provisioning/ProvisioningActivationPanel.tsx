import { Check, Copy } from "lucide-react";
import { useState } from "react";
import type { ProvisioningHealth } from "@/lib/screen-provisioning/provisioningSessionContract";
import { getScreenEntryUrl, getScreenLoginUrl } from "@/lib/screen-credential-lifecycle/screenEntryUrl";
import { Button } from "@/components/ui/button";

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

/** Primary provisioning onboarding — server-rendered recovery QR. */
export function ProvisioningActivationPanel({
  credentials,
  health,
  language,
}: {
  credentials: {
    deviceId: string;
    tokenId: string;
    recoveryQrSvg: string;
  };
  health: ProvisioningHealth | null;
  language: string;
}) {
  const isAr = language === "ar";
  const screenUrl = getScreenEntryUrl();
  const loginUrl = getScreenLoginUrl();
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
            ? "افتح الرابط على الجهاز. إذا لم يكن الاعتماد مخزّناً، استخدم رابط الدخول أو امسح QR."
            : "Open the screen URL on the device. If no credential is stored, use the login link or scan the QR code."}
        </p>
      </div>

      <CopyField
        label={isAr ? "رابط الشاشة" : "Screen URL"}
        value={screenUrl}
        copyLabel={copyLabel}
        copiedLabel={copiedLabel}
      />

      <CopyField
        label={isAr ? "رابط الدخول (بدون اعتماد مخزّن)" : "Login URL (no stored credential)"}
        value={loginUrl}
        copyLabel={copyLabel}
        copiedLabel={copiedLabel}
      />

      <div className="flex flex-col items-center gap-3">
        <div
          className="rounded-xl border bg-white p-4 [&>svg]:block"
          dangerouslySetInnerHTML={{ __html: credentials.recoveryQrSvg }}
        />
        <p className="max-w-sm text-center text-xs text-muted-foreground">
          {isAr
            ? "رمز QR يُولَّد على الخادم — الاعتماد لا يُعرض كنص في المتصفح."
            : "QR is server-rendered — credentials are not exposed as plaintext in the browser."}
        </p>
      </div>

      {minutesRemaining != null ? (
        <p className="text-center text-xs text-muted-foreground sm:text-start">
          {isAr
            ? `الوقت المتبقي لجلسة المشغّل: ${minutesRemaining} دقيقة`
            : `Operator session time remaining: ${minutesRemaining} min`}
        </p>
      ) : null}
    </div>
  );
}
