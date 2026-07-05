import { useState } from "react";
import { Loader2, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { screenTrpc } from "@/lib/operational-screen/screenTrpc";
import { parseManualCredentials, parsePairingPayload } from "@/lib/operational-screen/pairingPayload";
import { writeOperationalScreenCredentials } from "@/lib/operational-screen/credentialStore";
import { spaNavigate } from "@/const";

export function PairingShell() {
  const [deviceId, setDeviceId] = useState("");
  const [tokenId, setTokenId] = useState("");
  const [secret, setSecret] = useState("");
  const [jsonPayload, setJsonPayload] = useState("");
  const [error, setError] = useState<string | null>(null);

  const authenticate = screenTrpc.operationalDevice.runtime.authenticate.useMutation();

  const completePairing = async (creds: { deviceId: string; tokenId: string; secret: string }) => {
    setError(null);
    try {
      const result = await authenticate.mutateAsync(creds);
      if (result.session.deviceId !== creds.deviceId) {
        setError("Device identity mismatch — pairing rejected");
        return;
      }
      writeOperationalScreenCredentials(creds);
      spaNavigate("/screen", { replace: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : "pairing_failed";
      setError(message);
    }
  };

  const onManualSubmit = () => {
    const parsed = parseManualCredentials({ deviceId, tokenId, secret });
    if (!parsed.ok) {
      setError("Invalid credentials — check Device ID, Token ID, and Secret");
      return;
    }
    void completePairing(parsed.credentials);
  };

  const onJsonSubmit = () => {
    const parsed = parsePairingPayload(jsonPayload);
    if (!parsed.ok) {
      const messages: Record<string, string> = {
        invalid_json: "Invalid JSON payload",
        unsupported_version: "Unsupported QR version — request a new code from Screen Management",
        missing_fields: "Missing required pairing fields",
        invalid_protocol: "Not a MineuQR operational screen pairing code",
      };
      setError(messages[parsed.code] ?? "Invalid pairing payload");
      return;
    }
    void completePairing(parsed.credentials);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0b0e14] p-6 text-foreground">
      <div className="w-full max-w-lg space-y-8">
        <div className="text-center">
          <QrCode className="mx-auto mb-4 h-12 w-12 text-primary" />
          <h1 className="text-2xl font-semibold">Pair Operational Screen</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Scan or paste the provisioning code from Screen Management
          </p>
        </div>

        <div className="space-y-4 rounded-xl border border-border/50 bg-card/40 p-5">
          <h2 className="text-sm font-medium">Paste QR JSON</h2>
          <Textarea
            value={jsonPayload}
            onChange={(e) => setJsonPayload(e.target.value)}
            placeholder='{"mineuqr":"operational-screen-pairing","v":2,...}'
            rows={4}
            className="font-mono text-xs"
          />
          <Button onClick={onJsonSubmit} disabled={authenticate.isPending || !jsonPayload.trim()}>
            {authenticate.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Pair from JSON
          </Button>
        </div>

        <div className="space-y-4 rounded-xl border border-border/50 bg-card/40 p-5">
          <h2 className="text-sm font-medium">Manual entry</h2>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="device-id">Device ID</Label>
              <Input id="device-id" value={deviceId} onChange={(e) => setDeviceId(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="token-id">Token ID</Label>
              <Input id="token-id" value={tokenId} onChange={(e) => setTokenId(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="secret">Secret</Label>
              <Input id="secret" type="password" value={secret} onChange={(e) => setSecret(e.target.value)} />
            </div>
          </div>
          <Button onClick={onManualSubmit} disabled={authenticate.isPending}>
            {authenticate.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Pair manually
          </Button>
        </div>

        {error ? <p className="text-center text-sm text-destructive">{error}</p> : null}
      </div>
    </div>
  );
}
