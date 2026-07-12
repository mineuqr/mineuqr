import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Optional server-rendered recovery QR. */
export function ProvisioningOptionalQrPanel({
  credentials,
  language,
}: {
  credentials: {
    deviceId: string;
    tokenId: string;
    recoveryQrSvg: string;
  };
  language: string;
}) {
  const isAr = language === "ar";
  const [open, setOpen] = useState(false);

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
          <div
            className="rounded-xl border bg-white p-4 [&>svg]:block"
            dangerouslySetInnerHTML={{ __html: credentials.recoveryQrSvg }}
          />
          <p className="max-w-sm text-center text-xs text-muted-foreground">
            {isAr
              ? "رمز QR يُولَّد على الخادم — لا يُعرض الاعتماد كنص في المتصفح."
              : "QR is server-rendered — credentials are not exposed as plaintext in the browser."}
          </p>
        </div>
      ) : null}
    </div>
  );
}
