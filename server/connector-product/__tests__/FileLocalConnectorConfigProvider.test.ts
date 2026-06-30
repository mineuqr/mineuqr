import { afterEach, describe, expect, it, vi } from "vitest";
import {
  FileLocalConnectorConfigProvider,
  isConnectorEnrolled,
} from "../../connector-local/infrastructure/FileLocalConnectorConfigProvider";

describe("FileLocalConnectorConfigProvider", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("loads env-based config for backward compatibility", () => {
    vi.stubEnv("RLC_RESTAURANT_ID", "12");
    vi.stubEnv("RLC_CONNECTOR_ID", "rlc-12");
    vi.stubEnv("RLC_CREDENTIAL_SECRET", "secret-abc");
    vi.stubEnv("RLC_CLOUD_ENDPOINT", "ws://localhost:3000/connector/ws");
    const provider = new FileLocalConnectorConfigProvider();
    const config = provider.load();
    expect(config.restaurantId).toBe(12);
    expect(config.connectorId).toBe("rlc-12");
    expect(config.cloudEndpoint).toContain("/connector/ws");
    expect(isConnectorEnrolled()).toBe(true);
  });

  it("throws when not enrolled and env is missing", () => {
    vi.stubEnv("RLC_RESTAURANT_ID", "");
    vi.stubEnv("RLC_CONNECTOR_ID", "");
    vi.stubEnv("RLC_CREDENTIAL_SECRET", "");
    const provider = new FileLocalConnectorConfigProvider();
    expect(() => provider.load()).toThrow("connector_not_enrolled");
  });
});
