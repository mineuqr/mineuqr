import { useState } from "react";
import { screenTrpc } from "@/lib/operational-screen/screenTrpc";
import { resolvePairingRedeemMessage } from "@/lib/operational-screen/pairing/pairingRedeemMessages";
import { pairingScreenCopy } from "@/lib/operational-screen/pairing/pairingPresentation";
import { writeOperationalScreenCredentials } from "@/lib/operational-screen/credentialStore";
import { PairingScreenPanel } from "@/components/operational-screen/pairing/PairingScreenPanel";

export function PairingShell({ language = "en" }: { language?: string }) {
  const [pairingCode, setPairingCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  const redeem = screenTrpc.operationalDevice.runtime.redeemPairingCode.useMutation();
  const authenticate = screenTrpc.operationalDevice.runtime.authenticate.useMutation();
  const copy = pairingScreenCopy(language);

  const completePairing = async () => {
    setError(null);
    const code = pairingCode.trim();
    if (!code) {
      setError(copy.emptyCodeError);
      return;
    }

    try {
      const redeemed = await redeem.mutateAsync({ pairingCode: code });
      const creds = redeemed.bootstrapCredentials;
      const result = await authenticate.mutateAsync(creds);
      if (result.session.deviceId !== creds.deviceId) {
        setError(copy.mismatchError);
        return;
      }
      writeOperationalScreenCredentials(creds);
    } catch (err) {
      setError(resolvePairingRedeemMessage(err, language));
    }
  };

  const pending = redeem.isPending || authenticate.isPending;

  return (
    <PairingScreenPanel
      pairingCode={pairingCode}
      error={error}
      pending={pending}
      language={language}
      onPairingCodeChange={setPairingCode}
      onSubmit={() => void completePairing()}
    />
  );
}
