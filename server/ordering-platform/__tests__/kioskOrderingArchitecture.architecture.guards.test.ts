import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("SELF-ORDERING-KIOSK-ARCHITECTURE-1 server architecture guards", () => {
  it("registers kiosk as established Ordering Platform client", () => {
    const ownership = read("server/ordering-platform/orderingPlatformOwnership.ts");
    expect(ownership).toContain("ORDERING_PLATFORM_ESTABLISHED_CHANNELS");
    expect(ownership).toContain('"kiosk"');
    expect(ownership).toContain("ORDERING_PLATFORM_KIOSK_CHANNEL_CONTRACT");
    expect(ownership).toContain("ORDERING_PLATFORM_KIOSK_EXPERIENCE_LIFECYCLE");
    expect(ownership).toContain("ORDERING_PLATFORM_KIOSK_SESSION_LIFECYCLE");
    expect(ownership).toContain("ORDERING_PLATFORM_KIOSK_RUNTIME_CONSUMER");
  });

  it("keeps production active channels QR-only (kiosk established; platform activation separate)", () => {
    const ownership = read("server/ordering-platform/orderingPlatformOwnership.ts");
    expect(ownership).toMatch(
      /ORDERING_PLATFORM_ACTIVE_CHANNELS\s*=\s*\[["']qr["']\]/
    );
    expect(ownership).toContain('"mobile"');
    expect(ownership).toContain('"waiter_tablet"');
    expect(ownership).not.toMatch(
      /ORDERING_PLATFORM_FUTURE_CHANNELS\s*=\s*\[[^\]]*kiosk/
    );
  });

  it("kiosk does not gain a separate place-order authority", () => {
    const ownership = read("server/ordering-platform/orderingPlatformOwnership.ts");
    expect(ownership).toContain("ORDERING_PLATFORM_PLACE_ORDER_SERVICE");
    expect(ownership).toContain("PlaceOrderService");
    expect(ownership).not.toContain("KioskPlaceOrder");
  });

  it("shared contracts publish touch-first kiosk input model as presentation-only", () => {
    const contracts = read("shared/ordering-platform/orderingPlatformContracts.ts");
    expect(contracts).toContain("ORDERING_KIOSK_PRIMARY_INPUT");
    expect(contracts).toContain('"touch"');
    expect(contracts).toContain("ORDERING_KIOSK_COMPATIBILITY_INPUTS");
  });
});
