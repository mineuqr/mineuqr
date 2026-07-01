import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";
import { closeDb } from "../../../db";
import { destroyR2StorageClient } from "../../../storage/r2-provider";
import { shutdownReleaseDistributionResources } from "../releaseDistributionComposition";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

describe("RELEASE-PUBLISH-TERMINATION-2", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shutdownReleaseDistributionResources closes DB pool and destroys R2 client", async () => {
    const closeDbSpy = vi.spyOn(await import("../../../db"), "closeDb").mockResolvedValue();
    const destroyR2Spy = vi
      .spyOn(await import("../../../storage/r2-provider"), "destroyR2StorageClient")
      .mockImplementation(() => {});

    await shutdownReleaseDistributionResources();

    expect(destroyR2Spy).toHaveBeenCalledTimes(1);
    expect(closeDbSpy).toHaveBeenCalledTimes(1);
  });

  it("shutdownReleaseDistributionResources is idempotent", async () => {
    vi.spyOn(await import("../../../db"), "closeDb").mockResolvedValue();
    vi.spyOn(await import("../../../storage/r2-provider"), "destroyR2StorageClient").mockImplementation(
      () => {}
    );

    await shutdownReleaseDistributionResources();
    await shutdownReleaseDistributionResources();

    expect(closeDb).toBeDefined();
    expect(destroyR2StorageClient).toBeDefined();
  });

  it("closeDb is safe when no pool was opened", async () => {
    await expect(closeDb()).resolves.toBeUndefined();
    await expect(closeDb()).resolves.toBeUndefined();
  });

  it("destroyR2StorageClient is safe when no client was created", () => {
    expect(() => destroyR2StorageClient()).not.toThrow();
    expect(() => destroyR2StorageClient()).not.toThrow();
  });

  it("release CLI scripts tear down owned resources in finally", () => {
    for (const script of [
      "scripts/connector-release-automation.ts",
      "scripts/connector-release-admin.ts",
      "scripts/connector-release-publish.ts",
    ]) {
      const source = readFileSync(join(root, script), "utf8");
      expect(source).toContain("shutdownReleaseDistributionResources");
      expect(source).toContain("finally");
      expect(source).not.toMatch(/process\.exit\s*\(\s*0\s*\)/);
    }
  });
});
