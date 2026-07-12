import { Check, Copy, Download } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const onCopy = () => {
    void navigator.clipboard?.writeText(value).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <Button type="button" variant="outline" size="sm" onClick={onCopy}>
      {copied ? <Check className="mr-1 h-4 w-4" /> : <Copy className="mr-1 h-4 w-4" />}
      {copied ? (label.startsWith("Copy") ? "Copied" : label) : label}
    </Button>
  );
}

/** Server-rendered recovery QR — no client-side secret or QR generation. */
export function ServerRecoveryQr({
  recoveryQrSvg,
  displayName,
}: {
  recoveryQrSvg: string;
  displayName: string;
}) {
  const downloadSvg = () => {
    const blob = new Blob([recoveryQrSvg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${displayName.replace(/\s+/g, "-").toLowerCase()}-screen-qr.svg`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-3">
      <div
        className="flex justify-center rounded-xl border bg-white p-4 [&>svg]:block"
        dangerouslySetInnerHTML={{ __html: recoveryQrSvg }}
      />
      <Button type="button" size="sm" variant="outline" onClick={downloadSvg}>
        <Download className="mr-1 h-4 w-4" />
        Download QR
      </Button>
    </div>
  );
}
