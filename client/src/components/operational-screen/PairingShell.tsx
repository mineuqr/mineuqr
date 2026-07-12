import { useState } from "react";
import { Loader2, MonitorSmartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { screenTrpc } from "@/lib/operational-screen/screenTrpc";
import { resolvePairingRedeemMessage } from "@/lib/operational-screen/pairing/pairingRedeemMessages";
import { writeOperationalScreenCredentials } from "@/lib/operational-screen/credentialStore";
import { spaNavigate } from "@/const";

export function PairingShell() {
  const [pairingCode, setPairingCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  const redeem = screenTrpc.operationalDevice.runtime.redeemPairingCode.useMutation();
  const authenticate = screenTrpc.operationalDevice.runtime.authenticate.useMutation();

  const completePairing = async () => {
    setError(null);
    const code = pairingCode.trim();
    if (!code) {
      setError("Enter the pairing code from Screen Management.");
      return;
    }

    try {
      const redeemed = await redeem.mutateAsync({ pairingCode: code });
      const creds = redeemed.bootstrapCredentials;
      const result = await authenticate.mutateAsync(creds);
      if (result.session.deviceId !== creds.deviceId) {
        setError("Device identity mismatch — pairing rejected");
        return;
      }
      writeOperationalScreenCredentials(creds);
      spaNavigate("/screen", { replace: true });
    } catch (err) {
      setError(resolvePairingRedeemMessage(err));
    }
  };

  const pending = redeem.isPending || authenticate.isPending;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0b0e14] p-6 text-foreground">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <MonitorSmartphone className="mx-auto mb-4 h-12 w-12 text-primary" />
          <h1 className="text-2xl font-semibold">Pair Screen</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Enter the pairing code from Screen Management to connect this display.
          </p>
        </div>

        <div className="space-y-4 rounded-xl border border-border/50 bg-card/40 p-5">
          <div className="space-y-2">
            <Label htmlFor="pairing-code">Pairing Code</Label>
            <Input
              id="pairing-code"
              value={pairingCode}
              onChange={(e) => setPairingCode(e.target.value.toUpperCase())}
              placeholder="A7KD92"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              className="font-mono text-lg tracking-widest"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  void completePairing();
                }
              }}
            />
          </div>
          <Button className="w-full" onClick={() => void completePairing()} disabled={pending}>
            {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Pair Device
          </Button>
        </div>

        {error ? <p className="text-center text-sm text-destructive">{error}</p> : null}
      </div>
    </div>
  );
}
