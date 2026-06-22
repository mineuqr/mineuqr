import { describe, expect, it } from "vitest";
import { parseValidationArgv } from "./printingE2eValidationOptions";

describe("printingE2eValidationOptions", () => {
  it("parses CLI arguments", () => {
    const options = parseValidationArgv([
      "--config",
      "agent/config/custom.json",
      "--db-printer-id",
      "42",
      "--restaurant-id",
      "720007",
      "--port",
      "3200",
      "--skip-live-print",
      "--external-server",
      "--no-spawn-agent",
      "--registration-timeout-ms",
      "10000",
      "--live-print-timeout-ms",
      "20000",
    ]);

    expect(options).toMatchObject({
      configPath: "agent/config/custom.json",
      dbPrinterId: 42,
      restaurantId: 720007,
      port: 3200,
      skipLivePrint: true,
      externalServer: true,
      noSpawnAgent: true,
      registrationTimeoutMs: 10_000,
      livePrintTimeoutMs: 20_000,
    });
  });

  it("parses equals-form flags", () => {
    const options = parseValidationArgv([
      "--config=agent/config/a.json",
      "--db-printer-id=7",
    ]);

    expect(options.configPath).toBe("agent/config/a.json");
    expect(options.dbPrinterId).toBe(7);
  });
});
