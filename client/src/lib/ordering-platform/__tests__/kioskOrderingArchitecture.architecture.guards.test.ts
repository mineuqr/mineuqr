import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("SELF-ORDERING-KIOSK-ARCHITECTURE-1 client architecture guards", () => {
  it("publishes kiosk channel, experience, session, and runtime consumer contracts", () => {
    const channel = read("client/src/lib/ordering-platform/kioskOrderingChannelContract.ts");
    const experience = read("client/src/lib/ordering-platform/kioskExperienceLifecycle.ts");
    const session = read("client/src/lib/ordering-platform/kioskSessionLifecycle.ts");
    const consumer = read("client/src/lib/ordering-platform/kioskRuntimeConsumerContract.ts");

    expect(channel).toContain("KIOSK_ORDERING_CHANNEL");
    expect(channel).toContain("KIOSK_FORBIDDEN_PLATFORM_CONCERNS");
    expect(channel).toContain("ordering.getRuntimeBySlug");
    expect(experience).toContain("automatic_reset");
    expect(session).toContain("KIOSK_SESSION_RESET_TRIGGERS");
    expect(session).toContain("clear_cart");
    expect(consumer).toContain("deriveKioskOrderingRuntimeGates");
    expect(consumer).toContain("never_compose_runtime");
  });

  it("does not ship kiosk UI pages in this architecture program", () => {
    expect(existsSync(join(repoRoot, "client/src/pages/KioskView.tsx"))).toBe(false);
    expect(existsSync(join(repoRoot, "client/src/pages/kiosk"))).toBe(false);
  });

  it("experience and session lifecycles do not embed runtime construction", () => {
    const files = [
      "client/src/lib/ordering-platform/kioskExperienceLifecycle.ts",
      "client/src/lib/ordering-platform/kioskSessionLifecycle.ts",
    ];
    for (const rel of files) {
      const src = read(rel);
      expect(src).not.toContain("OrderingRuntimeContextFactory");
      expect(src).not.toContain("OrderingRuntimeMaterializer");
      expect(src).not.toContain("freezeOrderingRuntimeContext");
      expect(src).not.toMatch(/isRestaurantOpen\s*\(/);
    }
  });

  it("kiosk runtime consumer derives gates only — does not construct runtime", () => {
    const consumer = read(
      "client/src/lib/ordering-platform/kioskRuntimeConsumerContract.ts"
    );
    expect(consumer).toContain("deriveKioskOrderingRuntimeGates");
    expect(consumer).not.toContain("OrderingRuntimeContextFactory");
    expect(consumer).not.toContain("OrderingRuntimeMaterializer");
    expect(consumer).not.toContain("freezeOrderingRuntimeContext");
    expect(consumer).not.toMatch(/isRestaurantOpen\s*\(/);
  });

  it("shared runtime contract remains free of kiosk form-factor fields", () => {
    const runtime = read("shared/ordering-platform/orderingRuntimeContract.ts");
    expect(runtime).not.toMatch(/\borientation\s*:/);
    expect(runtime).not.toMatch(/\bscreenWidth\s*:/);
    expect(runtime).not.toMatch(/\bformFactor\s*:/);
    expect(runtime).not.toMatch(/\btouchHardware\s*:/);
  });
});
