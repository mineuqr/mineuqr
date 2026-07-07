import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";

/** Optional QR — hidden by default (DEVICE-PROVISIONING-UX-2). */
export function ProvisioningOptionalQrPanel({
  credentials,
  language,
}: {
  credentials: {
    deviceId: string;
    tokenId: string;
    secret: string;
    qrPayload: Record<string, unknown>;
  };
  language: string;
}) {
  const isAr = language === "ar";
  const [open, setOpen] = useState(false);
  const qrValue = JSON.stringify(credentials.qrPayload);

  return (
    <div className="rounded-xl border border-border/30">
      <Button
        type="button"
        variant="ghost"
        className="flex w-full items-center justify-between px-4 py-3"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="text-sm font-medium">
          {isAr ? "عرض رمز QR (اختياري)" : "Show QR code (optional)"}
        </span>
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </Button>
      {open ? (
        <div className="flex flex-col items-center gap-3 border-t border-border/30 px-4 pb-5 pt-4">
          <div className="rounded-xl border bg-white p-4">
            <QRCodeSVG value={qrValue} size={200} level="M" />
          </div>
          <p className="max-w-sm text-center text-xs text-muted-foreground">
            {isAr
              ? "يمكنك مسح الرمز اختيارياً إذا كان الجهاز يدعم ذلك. الرابط ورمز التفعيل هما الطريقة الأساسية."
              : "You may optionally scan this QR if the device supports it. URL and activation code are the primary method."}
          </p>
        </div>
      ) : null}
    </div>
  );
}
