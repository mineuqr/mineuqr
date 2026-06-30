import { describe, expect, it } from "vitest";
import { InMemoryConnectorCredentialRepository } from "../infrastructure/InMemoryConnectorCredentialRepository";
import { InMemoryConnectorPairingRepository } from "../infrastructure/InMemoryConnectorPairingRepository";
import { ConnectorAuthenticationService } from "../services/ConnectorAuthenticationService";

describe("connector enrollment persistence", () => {
  it("survives cloud restart simulation via durable credential reload", async () => {
    const pairingRepo = new InMemoryConnectorPairingRepository();
    const credentialRepo = new InMemoryConnectorCredentialRepository();
    const auth = new ConnectorAuthenticationService(pairingRepo, credentialRepo, 15 * 60 * 1000, () => 1_700_000_000_000);

    const pairing = await auth.issuePairingToken(42);
    const issued = await auth.completePairing(pairing.token, "rlc-kitchen-1");
    expect(issued).not.toBeNull();

    const restartedCredentialRepo = new InMemoryConnectorCredentialRepository();
    const persisted = await credentialRepo.findById(issued!.credentialId);
    expect(persisted).not.toBeNull();
    await restartedCredentialRepo.save(persisted!);

    const restartedAuth = new ConnectorAuthenticationService(
      new InMemoryConnectorPairingRepository(),
      restartedCredentialRepo,
      15 * 60 * 1000,
      () => 1_700_000_000_000
    );

    const validation = await restartedAuth.validateCredential({
      credentialId: issued!.credentialId,
      credentialSecret: issued!.secret,
      restaurantId: 42,
      connectorId: "rlc-kitchen-1",
      version: "1.0.0",
    });

    expect(validation.valid).toBe(true);
    const reloaded = await restartedCredentialRepo.findById(issued!.credentialId);
    expect(reloaded?.lastSeenAt).toBeTruthy();
    expect(reloaded?.connectorVersion).toBe("1.0.0");
  });

  it("does not regenerate credentials for an already enrolled connector", async () => {
    const pairingRepo = new InMemoryConnectorPairingRepository();
    const credentialRepo = new InMemoryConnectorCredentialRepository();
    const auth = new ConnectorAuthenticationService(pairingRepo, credentialRepo);

    const firstPairing = await auth.issuePairingToken(7);
    const firstCredential = await auth.completePairing(firstPairing.token, "rlc-7");
    expect(firstCredential).not.toBeNull();

    const secondPairing = await auth.issuePairingToken(7);
    const secondCredential = await auth.completePairing(secondPairing.token, "rlc-7");
    expect(secondCredential).toBeNull();

    const stored = await credentialRepo.findByConnectorInstanceId("rlc-7");
    expect(stored?.credentialId).toBe(firstCredential!.credentialId);
  });

  it("pairing token consumption survives repository restart", async () => {
    const pairingRepo = new InMemoryConnectorPairingRepository();
    const credentialRepo = new InMemoryConnectorCredentialRepository();
    const auth = new ConnectorAuthenticationService(pairingRepo, credentialRepo);

    const pairing = await auth.issuePairingToken(99);
    const restartedPairingRepo = new InMemoryConnectorPairingRepository();
    const tokenRecord = await pairingRepo.findByToken(pairing.token);
    await restartedPairingRepo.save(tokenRecord!);

    const restartedAuth = new ConnectorAuthenticationService(restartedPairingRepo, credentialRepo);
    const credential = await restartedAuth.completePairing(pairing.token, "rlc-99");
    expect(credential?.restaurantId).toBe(99);

    const consumed = await restartedPairingRepo.findByToken(pairing.token);
    expect(consumed?.consumedAt).toBeTruthy();
  });
});
