import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { screenOnboardingCopy } from "@/lib/operational-screen/pairing/pairingPresentation";

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
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">{label}</span>
        <button
          type="button"
          onClick={onCopy}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          {copied ? <Check className="h-3.5 w-3.5" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />}
          {copied ? copiedLabel : copyLabel}
        </button>
      </div>
      <p className="w-full break-all rounded-lg bg-muted px-3 py-3 font-mono text-sm">{value}</p>
    </div>
  );
}

/** Primary operator onboarding — screen link + pairing code. */
export function ScreenOnboardingFields({
  screenLink,
  pairingCode,
  language = "en",
  pairingCodeHelper,
}: {
  screenLink: string;
  pairingCode: string | null;
  language?: string;
  pairingCodeHelper?: string | null;
}) {
  const copy = screenOnboardingCopy(language);

  return (
    <div className="space-y-5">
      <CopyField
        label={copy.screenLinkLabel}
        value={screenLink}
        copyLabel={copy.copyLink}
        copiedLabel={copy.copied}
      />
      {pairingCode ? (
        <CopyField
          label={copy.pairingCodeLabel}
          value={pairingCode}
          copyLabel={copy.copyCode}
          copiedLabel={copy.copied}
        />
      ) : (
        <div className="rounded-lg border border-border/40 bg-muted/10 px-3 py-3 text-sm text-muted-foreground">
          {pairingCodeHelper ?? copy.pairingCodePending}
        </div>
      )}
    </div>
  );
}

export function ScreenOnboardingOptionalQr({
  recoveryQrSvg,
  language = "en",
}: {
  recoveryQrSvg: string;
  language?: string;
}) {
  const copy = screenOnboardingCopy(language);

  return (
    <details className="rounded-xl border border-border/30 bg-muted/5 p-4">
      <summary className="cursor-pointer list-none text-sm font-medium text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary [&::-webkit-details-marker]:hidden">
        {copy.moreOptions} · {copy.optionalQr}
      </summary>
      <div className="mt-4 flex flex-col items-center gap-3">
        <div
          className="rounded-xl border bg-white p-4 [&>svg]:block"
          dangerouslySetInnerHTML={{ __html: recoveryQrSvg }}
        />
        <p className="max-w-sm text-center text-xs text-muted-foreground">{copy.qrHelper}</p>
      </div>
    </details>
  );
}
