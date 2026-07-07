import { useState } from "react";
import { Loader2, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { screenTrpc } from "@/lib/operational-screen/screenTrpc";
import { writeOperationalScreenCredentials } from "@/lib/operational-screen/credentialStore";
import { spaNavigate } from "@/const";
import { TRPCClientError } from "@trpc/client";

const ACTIVATION_ERROR_MESSAGES: Record<string, string> = {
  activation_code_invalid: "Invalid activation code — check the code from Screen Management.",
  activation_code_expired: "This activation code has expired — request a new one from Screen Management.",
  activation_code_used: "This activation code was already used — request a new one from Screen Management.",
  device_disabled: "This screen has been disabled — contact your operator.",
  token_revoked: "These credentials are no longer valid.",
};

type ActivationPhase = "enter" | "waiting" | "connected";

function formatActivationInput(raw: string): string {
  const normalized = raw.replace(/[\s-]/g, "").toUpperCase().slice(0, 8);
  if (normalized.length <= 4) return normalized;
  return `${normalized.slice(0, 4)}-${normalized.slice(4)}`;
}

export function DeviceActivationShell() {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<ActivationPhase>("enter");

  const activate = screenTrpc.operationalDevice.runtime.authenticateByActivationCode.useMutation({
    onSuccess: (result) => {
      const creds = result.bootstrapCredentials;
      if (!creds) {
        setError("Activation succeeded but credentials were not issued — contact support.");
        return;
      }
      writeOperationalScreenCredentials(creds);
      setPhase("connected");
      window.setTimeout(() => spaNavigate("/screen", { replace: true }), 1200);
    },
    onError: (err) => {
      if (err instanceof TRPCClientError) {
        setError(ACTIVATION_ERROR_MESSAGES[err.message] ?? "Unable to activate — try again.");
      } else {
        setError("Unable to activate — try again.");
      }
      setPhase("enter");
    },
  });

  const onConnect = () => {
    setError(null);
    const formatted = formatActivationInput(code);
    if (formatted.replace(/-/g, "").length < 8) {
      setError("Enter the full activation code (XXXX-XXXX).");
      return;
    }
    setPhase("waiting");
    activate.mutate({ activationCode: formatted });
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0b0e14] p-6 text-foreground">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <Monitor className="mx-auto mb-4 h-12 w-12 text-primary" />
          <h1 className="text-2xl font-semibold">Activate Device</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Enter the activation code from Screen Management. No camera required.
          </p>
        </div>

        {phase === "enter" ? (
          <div className="space-y-4 rounded-xl border border-border/50 bg-card/40 p-5">
            <div className="space-y-2">
              <Label htmlFor="activation-code">Activation code</Label>
              <Input
                id="activation-code"
                value={code}
                onChange={(e) => setCode(formatActivationInput(e.target.value))}
                placeholder="XXXX-XXXX"
                className="text-center font-mono text-lg tracking-[0.25em]"
                autoComplete="off"
              />
            </div>
            <Button className="w-full" onClick={onConnect} disabled={activate.isPending}>
              Connect
            </Button>
          </div>
        ) : null}

        {phase === "waiting" ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-border/50 bg-card/40 p-8">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Connecting device…</p>
          </div>
        ) : null}

        {phase === "connected" ? (
          <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-6 text-center text-sm text-emerald-200">
            Connected — starting screen runtime…
          </div>
        ) : null}

        {error ? <p className="text-center text-sm text-destructive">{error}</p> : null}
      </div>
    </div>
  );
}
