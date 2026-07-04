import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../..");

function read(rel: string) {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("DEVICE-MANAGEMENT-1 architecture guards", () => {
  it("device runtime router uses deviceProcedure not verifiedProcedure", () => {
    const runtime = read("server/operational-device/routers/operationalDeviceRuntimeRouter.ts");
    expect(runtime).toContain("deviceProcedure");
    expect(runtime).not.toContain("verifiedProcedure");
    expect(runtime).not.toMatch(/order\.updateStatus|orderRouter/);
    expect(runtime).not.toContain("screenConfig");
    expect(runtime).not.toContain("updateScreenSettings");
  });

  it("device management router uses operator verifiedProcedure", () => {
    const management = read("server/operational-device/routers/operationalDeviceManagementRouter.ts");
    expect(management).toContain("verifiedProcedure");
    expect(management).not.toContain("deviceProcedure");
  });

  it("operational device schema defines registry and tokens", () => {
    const schema = read("drizzle/0054_operational_devices.sql");
    expect(schema).toContain("operational_devices");
    expect(schema).toContain("operational_device_tokens");
    expect(schema).toContain("kitchen_display");
  });

  it("screen config migration is management-only presentation storage", () => {
    const migration = read("drizzle/0055_operational_device_screen_config.sql");
    expect(migration).toContain("screenConfig");
  });

  it("device auth header format is Device deviceId:tokenId:secret", () => {
    const auth = read("server/operational-device/services/OperationalDeviceAuthService.ts");
    expect(auth).toContain('startsWith("device ")');
  });
});
