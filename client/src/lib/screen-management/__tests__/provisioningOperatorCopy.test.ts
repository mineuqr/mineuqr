import { describe, expect, it } from "vitest";
import {
  provisioningActivationStateLabel,
  provisioningPairingStateLabel,
  provisioningStatusLabel,
  regenerateCredentialConfirmationCopy,
} from "@/lib/screen-management/provisioningOperatorCopy";

describe("provisioningOperatorCopy", () => {
  it("maps provisioning status to operator language", () => {
    expect(provisioningStatusLabel("waiting_for_pairing", "en")).toBe("Waiting for connection");
    expect(provisioningStatusLabel("operational", "en")).toBe("Online");
    expect(provisioningStatusLabel("operational", "ar")).toBe("متصل");
  });

  it("maps pairing and activation states without engineering terms", () => {
    expect(provisioningPairingStateLabel("unpaired", "en")).toBe("Not connected");
    expect(provisioningActivationStateLabel("loading_runtime", "en")).toBe("Starting screen");
    expect(provisioningActivationStateLabel("blocked", "en")).toBe("Needs attention");
  });

  it("uses Regenerate Credential confirmation wording", () => {
    const copy = regenerateCredentialConfirmationCopy("en");
    expect(copy.title).toContain("Regenerate Credential");
    expect(copy.confirm).toBe("Regenerate Credential");
  });
});
