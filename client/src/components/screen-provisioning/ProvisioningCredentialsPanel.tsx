import { Check, Copy } from "lucide-react";
import { useState } from "react";
import type { ProvisioningQrPayload } from "@/lib/screen-provisioning/provisioningSessionContract";

function CredentialField({
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
    <div className="w-full space-y-1">
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
      <p className="w-full break-all rounded-lg bg-muted p-2 font-mono text-xs">{value}</p>
    </div>
  );
}

/** Server-rendered recovery QR — no plaintext authentication material. */
export function ProvisioningCredentialsPanel({
  credentials,
  language,
}: {
  credentials: ProvisioningQrPayload;
  language: string;
}) {
  const isAr = language === "ar";

  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-border/40 bg-muted/10 p-6">
      <div
        className="rounded-xl border bg-white p-4 [&>svg]:block"
        dangerouslySetInnerHTML={{ __html: credentials.recoveryQrSvg }}
      />
      <p className="text-center text-sm text-muted-foreground">
        {isAr
          ? "امسح رمز QR على الجهاز لربط الشاشة."
          : "Scan the QR code on your device to connect this screen."}
      </p>
      <div className="w-full max-w-md space-y-2">
        <CredentialField
          label={isAr ? "معرّف الشاشة" : "Screen ID"}
          value={credentials.deviceId}
          copyLabel={isAr ? "نسخ" : "Copy"}
          copiedLabel={isAr ? "تم النسخ" : "Copied"}
        />
      </div>
    </div>
  );
}
