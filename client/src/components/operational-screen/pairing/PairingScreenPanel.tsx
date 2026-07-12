import { Loader2 } from "lucide-react";
import { MineuQrScreenMark } from "@/components/operational-screen/pairing/MineuQrScreenMark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { pairingScreenCopy } from "@/lib/operational-screen/pairing/pairingPresentation";

export function PairingScreenPanel({
  pairingCode,
  error,
  pending,
  language = "en",
  onPairingCodeChange,
  onSubmit,
}: {
  pairingCode: string;
  error: string | null;
  pending: boolean;
  language?: string;
  onPairingCodeChange: (value: string) => void;
  onSubmit: () => void;
}) {
  const copy = pairingScreenCopy(language);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0b0e14] px-4 py-8 text-foreground sm:px-6">
      <div className="w-full max-w-md space-y-8">
        <header className="space-y-3 text-center">
          <MineuQrScreenMark />
          <p className="text-sm font-medium text-muted-foreground">{copy.subtitle}</p>
        </header>

        <section
          className="space-y-5 rounded-2xl border border-border/50 bg-card/40 p-5 sm:p-6"
          aria-labelledby="pairing-code-heading"
        >
          <div className="space-y-2">
            <Label htmlFor="pairing-code" id="pairing-code-heading" className="text-base font-medium">
              {copy.inputLabel}
            </Label>
            <Input
              id="pairing-code"
              name="pairing-code"
              value={pairingCode}
              onChange={(e) => onPairingCodeChange(e.target.value.toUpperCase())}
              placeholder={copy.inputPlaceholder}
              autoComplete="off"
              autoCapitalize="characters"
              autoFocus
              spellCheck={false}
              inputMode="text"
              aria-invalid={error != null}
              aria-describedby={error ? "pairing-error" : "pairing-help"}
              disabled={pending}
              className="h-14 font-mono text-xl tracking-[0.35em] focus-visible:ring-2 focus-visible:ring-primary"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !pending) {
                  e.preventDefault();
                  onSubmit();
                }
              }}
            />
          </div>

          <Button
            type="button"
            className="h-12 w-full text-base"
            onClick={onSubmit}
            disabled={pending}
            aria-busy={pending}
          >
            {pending ? <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden /> : null}
            {pending ? copy.connectingLabel : copy.submitLabel}
          </Button>

          {error ? (
            <p id="pairing-error" role="alert" className="text-center text-sm text-destructive">
              {error}
            </p>
          ) : null}
        </section>

        <aside id="pairing-help" className="rounded-xl border border-border/30 bg-muted/10 p-4 text-center">
          <p className="text-sm font-medium">{copy.helpHeading}</p>
          <p className="mt-1 text-sm text-muted-foreground">{copy.helpBody}</p>
        </aside>
      </div>
    </div>
  );
}
