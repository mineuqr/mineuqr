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
    const superseded =
      await releaseDistributionComposition.adminService.administrativelySupersede(version);
    console.log(`Administratively superseded release ${superseded.version} (${superseded.status})`);
    return;
  }

  throw new Error("Usage: connector-release-admin.ts supersede --version <version>");
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
