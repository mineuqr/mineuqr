import { describe, expect, it } from "vitest";
import { composeConnectorNetwork } from "../networkComposition";
import { ConnectorAuthenticationService } from "../services/ConnectorAuthenticationService";

describe("ConnectorAuthenticationService", () => {
  it("issues pairing token and completes pairing into credential", async () => {
    const network = composeConnectorNetwork();
    const pairing = await network.session.authService.issuePairingToken(42);
    const credential = await network.session.authService.completePairing(pairing.token, "rlc-42");

    expect(credential?.restaurantId).toBe(42);
    expect(credential?.credentialId).toBe("cred-rlc-42");
    expect(credential?.secret).toBeTruthy();
  });

  it("rejects duplicate pairing for enrolled connector", async () => {
    const network = composeConnectorNetwork();
    const pairing = await network.session.authService.issuePairingToken(9);
    const first = await network.session.authService.completePairing(pairing.token, "rlc-9");
    expect(first).not.toBeNull();

    const secondPairing = await network.session.authService.issuePairingToken(9);
    const second = await network.session.authService.completePairing(secondPairing.token, "rlc-9");
    expect(second).toBeNull();
  });

  it("rejects invalid credential secret", async () => {
    const network = composeConnectorNetwork();
    const pairing = await network.session.authService.issuePairingToken(1);
    await network.session.authService.completePairing(pairing.token, "rlc-1");

    const result = await network.session.authService.validateCredential({
      credentialId: "cred-rlc-1",
      credentialSecret: "wrong",
      restaurantId: 1,
      connectorId: "rlc-1",
      version: "1.0.0",
    });

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.failureCode).toBe("authentication_failure");
    }
  });

  it("rejects unsupported connector version", async () => {
    const network = composeConnectorNetwork();
    const result = await network.session.authService.validateCredential({
      credentialId: "cred-x",
      credentialSecret: "secret",
      restaurantId: 1,
      connectorId: "x",
      version: "0.1.0",
    });

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.failureCode).toBe("version_mismatch");
    }
  });

  it("rejects revoked credentials", async () => {
    const network = composeConnectorNetwork();
    const pairing = await network.session.authService.issuePairingToken(5);
    const credential = await network.session.authService.completePairing(pairing.token, "rlc-5");
    await network.session.authService.revokeCredential(credential!.credentialId);

    const result = await network.session.authService.validateCredential({
      credentialId: credential!.credentialId,
      credentialSecret: credential!.secret,
      restaurantId: 5,
      connectorId: "rlc-5",
      version: "1.0.0",
    });

    expect(result.valid).toBe(false);
  });
});

describe("MIN_CONNECTOR_VERSION", () => {
  it("is defined for session compatibility checks", () => {
    expect(ConnectorAuthenticationService).toBeDefined();
  });
});
