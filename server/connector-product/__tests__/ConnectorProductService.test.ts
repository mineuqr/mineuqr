import { describe, expect, it } from "vitest";
import { ConnectorProductService } from "../ConnectorProductService";

describe("ConnectorProductService", () => {
  it("issues pairing token for restaurant", async () => {
    const service = new ConnectorProductService();
    const pairing = await service.issuePairingToken(42);
    expect(pairing.restaurantId).toBe(42);
    expect(pairing.pairingToken.length).toBeGreaterThan(8);
    expect(pairing.productName).toBe("MineuQR Connector");
  });

  it("completes pairing into connector credentials", async () => {
    const service = new ConnectorProductService();
    const pairing = await service.issuePairingToken(7);
    const result = await service.completePairing({
      pairingToken: pairing.pairingToken,
      connectorInstanceId: "rlc-kitchen-1",
      hostLabel: "Kitchen PC",
    });
    expect(result?.connectorId).toBe("rlc-kitchen-1");
    expect(result?.credentialSecret.length).toBeGreaterThan(8);
    expect(result?.restaurantId).toBe(7);
  });

  it("exposes download metadata", async () => {
    const service = new ConnectorProductService();
    const info = await service.getDownloadInfo();
    expect(info.productName).toBe("MineuQR Connector");
    expect(info.version).toBeTruthy();
    expect(info.windowsInstallerName).toContain("MineuQR-Connector");
  });
});
