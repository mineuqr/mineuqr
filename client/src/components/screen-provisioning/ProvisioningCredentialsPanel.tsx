import { Check, Copy } from "lucide-react";
import { useState } from "react";
import type { ProvisioningQrPayload } from "@/lib/screen-provisioning/provisioningSessionContract";
import { cn } from "@/lib/utils";
import { QRCodeSVG } from "qrcode.react";

function CredentialField({
  label,
  value,
  copyLabel,
  copiedLabel,
  sensitive,
}: {
  label: string;
  value: string;
  copyLabel: string;
  copiedLabel: string;
  sensitive?: boolean;
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
      <p
        className={cn(
          "w-full break-all rounded-lg bg-muted p-2 font-mono text-xs",
          sensitive && "text-destructive-foreground/90"
        )}
      >
        {value}
      </p>
    </div>
  );
}

/** QR and credential display — no business logic. */
export function ProvisioningCredentialsPanel({
  credentials,
  language,
}: {
  credentials: ProvisioningQrPayload;
  language: string;
}) {
  const isAr = language === "ar";
  const qrValue = JSON.stringify(credentials.qrPayload);

  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-border/40 bg-muted/10 p-6">
      <div className="rounded-xl border bg-white p-4">
        <QRCodeSVG value={qrValue} size={220} level="M" />
      </div>
      <p className="text-center text-sm text-muted-foreground">
        {isAr
          ? "امسح الرمز على الشاشة لربط الجهاز. لن تُعرض بيانات الاعتماد مرة أخرى بعد مغادرة الجلسة."
          : "Scan on the screen to link the device. Credentials will not be shown again after leaving this session."}
      </p>
      <div className="w-full max-w-md space-y-2">
        <CredentialField
          label={isAr ? "معرّف الجهاز" : "Device ID"}
          value={credentials.deviceId}
          copyLabel={isAr ? "نسخ" : "Copy"}
          copiedLabel={isAr ? "تم النسخ" : "Copied"}
        />
        <CredentialField
          label={isAr ? "معرّف الرمز" : "Token ID"}
          value={credentials.tokenId}
          copyLabel={isAr ? "نسخ" : "Copy"}
          copiedLabel={isAr ? "تم النسخ" : "Copied"}
        />
        <CredentialField
          label={isAr ? "الرمز السري" : "Secret"}
          value={credentials.secret}
          copyLabel={isAr ? "نسخ" : "Copy"}
          copiedLabel={isAr ? "تم النسخ" : "Copied"}
          sensitive
        />
      </div>
    </div>
  );
}
