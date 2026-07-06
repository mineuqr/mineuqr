import { describe, expect, it } from "vitest";
import { collectRuntimeFingerprint } from "../runtimeFingerprint";
import { resolveConfigVersion } from "../configVersion";

describe("runtimeFingerprint", () => {
  it("collects diagnostic fingerprint without auth fields", () => {
    const fp = collectRuntimeFingerprint("boot-1");
    expect(fp.schemaVersion).toBe(1);
    expect(fp.runtime).toBe("operational-screen-web");
    expect(fp.bootstrapId).toBe("boot-1");
    expect(fp).not.toHaveProperty("secret");
    expect(fp).not.toHaveProperty("tokenId");
  });
});

describe("configVersion", () => {
  it("prefers screenConfigRevision when present", () => {
    expect(
      resolveConfigVersion({
        updatedAt: "2026-07-05T12:00:00.000Z",
        screenConfigRevision: 42,
      })
    ).toBe("42");
  });

  it("falls back to updatedAt only for legacy rows without revision", () => {
    expect(resolveConfigVersion({ updatedAt: "2026-07-05T12:00:00.000Z" })).toBe(
      "2026-07-05T12:00:00.000Z"
    );
    expect(
      resolveConfigVersion({
        updatedAt: "2026-07-05T12:00:00.000Z",
        screenConfigRevision: 0,
      })
    ).toBe("2026-07-05T12:00:00.000Z");
  });
});
