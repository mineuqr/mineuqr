#!/usr/bin/env tsx
import { releaseDistributionComposition } from "../server/connector-product/release-distribution/releaseDistributionComposition";

async function main(): Promise<void> {
  const command = process.argv[2];
  const versionIndex = process.argv.indexOf("--version");
  const version = versionIndex >= 0 ? process.argv[versionIndex + 1] : null;
  if (!version) {
    throw new Error("Version is required: --version <version>");
  }

  if (command === "supersede") {
    const active = await releaseDistributionComposition.registry.getActiveRelease();
    if (!active || active.version !== version) {
      throw new Error(`Release ${version} is not the active release`);
    }
    await releaseDistributionComposition.registry.transitionRelease(
      version,
      "superseded",
      new Date().toISOString()
    );
    console.log(`Superseded active release ${version}`);
    return;
  }

  throw new Error("Usage: connector-release-admin.ts supersede --version <version>");
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
