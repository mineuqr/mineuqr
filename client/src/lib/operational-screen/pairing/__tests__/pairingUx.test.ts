import { TRPCClientError } from "@trpc/client";
import { describe, expect, it } from "vitest";
import {
  pairingScreenCopy,
  screenBootLoadingCopy,
  screenOnboardingCopy,
} from "../pairingPresentation";
import {
  pairingRedeemOperatorMessage,
  resolvePairingRedeemMessage,
} from "../pairingRedeemMessages";
import { resolveScreenBootLoadingMessage } from "../screenBootPresentation";

describe("SCREEN-PAIRING-CODE-UX-1 presentation", () => {
  it("pairing screen uses operator terminology only", () => {
    const copy = pairingScreenCopy("en");
    expect(copy.subtitle).toBe("Kitchen Display");
    expect(copy.inputLabel).toBe("Enter Pairing Code");
    expect(copy.submitLabel).toBe("Connect Screen");
    expect(copy.helpHeading).toBe("Need a code?");
    expect(copy.helpBody).toContain("Screen Management");
  });

  it("boot loading messages avoid technical wording", () => {
    const copy = screenBootLoadingCopy("en");
    expect(copy.checking).toBe("Checking screen…");
    expect(copy.connecting).toBe("Connecting…");
    expect(copy.startingKitchen).toBe("Starting kitchen display…");
    expect(copy.checking.toLowerCase()).not.toContain("credential");
    expect(copy.checking.toLowerCase()).not.toContain("token");
  });

  it("resolves boot messages by phase and role", () => {
    expect(resolveScreenBootLoadingMessage("loading", null)).toBe("Checking screen…");
    expect(resolveScreenBootLoadingMessage("validating", null)).toBe("Connecting…");
    expect(resolveScreenBootLoadingMessage("heartbeat_active", "kitchen_display")).toBe(
      "Starting kitchen display…"
    );
  });

  it("maps redeem failures to operator-safe messages", () => {
    expect(pairingRedeemOperatorMessage("pairing_code_invalid")).toBe("Pairing code not found.");
    expect(pairingRedeemOperatorMessage("pairing_code_expired")).toBe(
      "This pairing code has expired."
    );
    expect(pairingRedeemOperatorMessage("token_revoked")).toContain("removed");
  });

  it("never surfaces raw TRPC codes to operators", () => {
    const error = new TRPCClientError("pairing_code_invalid", {
      result: { error: { message: "pairing_code_invalid", code: -32001, data: { code: "BAD_REQUEST" } } },
    });
    const message = resolvePairingRedeemMessage(error);
    expect(message).not.toContain("pairing_code");
    expect(message).toBe("Pairing code not found.");
  });

  it("screen onboarding prioritizes link and pairing code labels", () => {
    const copy = screenOnboardingCopy("en");
    expect(copy.screenLinkLabel.toLowerCase()).toContain("screen");
    expect(copy.pairingCodeLabel.toLowerCase()).toContain("pairing");
    expect(copy.optionalQr.toLowerCase()).toContain("optional");
  });
});
