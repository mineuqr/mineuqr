#!/usr/bin/env tsx
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import {
  getReleaseStagingRoot,
  getWindowsInstallerFileName,
  readConnectorReleaseManifest,
} from "../server/connector-product/release/connectorRelease";
import type { ReleaseAuditContext } from "../server/connector-product/release-distribution/domain/PublishedRelease";
import { releaseDistributionComposition, shutdownReleaseDistributionResources } from "../server/connector-product/release-distribution/releaseDistributionComposition";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function resolveVersion(): string {
  const versionArgIndex = process.argv.indexOf("--version");
  if (versionArgIndex >= 0 && process.argv[versionArgIndex + 1]) {
    return process.argv[versionArgIndex + 1]!;
  }
  return readConnectorReleaseManifest().version;
}

function readAuditContext(): ReleaseAuditContext {
  return {
    gitTag: process.env.RELEASE_GIT_TAG?.trim() || process.env.GITHUB_REF_NAME?.trim() || null,
    commitSha: process.env.RELEASE_COMMIT_SHA?.trim() || process.env.GITHUB_SHA?.trim() || null,
    workflowRunId:
      process.env.RELEASE_WORKFLOW_RUN_ID?.trim() || process.env.GITHUB_RUN_ID?.trim() || null,
    publisher:
      process.env.RELEASE_PUBLISHER?.trim() ||
      process.env.GITHUB_ACTOR?.trim() ||
      process.env.USERNAME?.trim() ||
      null,
  };
}

async function runCandidate(version: string): Promise<void> {
  const manifest = readConnectorReleaseManifest();
  if (manifest.version !== version) {
    throw new Error(
      `Release authority version ${manifest.version} does not match requested version ${version}`
    );
  }

  const record = await releaseDistributionComposition.publicationService.registerCandidate({
    version,
    productName: manifest.productName,
    installerFileName: getWindowsInstallerFileName(manifest),
    audit: readAuditContext(),
  });

  console.log(`Registered release candidate ${record.version} (${record.status})`);
}

async function runPublish(version: string): Promise<void> {
  const manifest = readConnectorReleaseManifest();
  const releaseDirectory = getReleaseStagingRoot(repoRoot, manifest);
  const installerFileName = getWindowsInstallerFileName(manifest);

  const result = await releaseDistributionComposition.publicationService.publishRelease({
    version,
    releaseDirectory,
    installerFileName,
    activate: false,
  });

  console.log(`Published connector release ${result.published.version} (${result.published.status})`);
  console.log(`Installer URL: ${result.installerUrl}`);
  console.log(`Manifest URL: ${result.manifestUrl}`);
}

async function runVerify(version: string): Promise<void> {
  const result =
    await releaseDistributionComposition.verificationService.verifyPublishedRelease(version);
  console.log(`Verified connector release ${result.version}`);
}

async function runSmokeTest(version: string): Promise<void> {
  const manifest = readConnectorReleaseManifest();
  const installerFileName = getWindowsInstallerFileName(manifest);
  const releaseDirectory = getReleaseStagingRoot(repoRoot, manifest);
  const installerPath = path.join(releaseDirectory, installerFileName);
  const diagnosticsDir = path.join(releaseDirectory, "smoke-diagnostics");
  const scriptPath = path.join(repoRoot, "connector-product", "windows", "smoke-test-installer.ps1");
  const result = spawnSync(
    "powershell.exe",
    [
      "-ExecutionPolicy",
      "Bypass",
      "-File",
      scriptPath,
      "-InstallerPath",
      installerPath,
      "-ExpectedVersion",
      version,
      "-ExpectedProductName",
      manifest.productName,
      "-DiagnosticsDir",
      diagnosticsDir,
    ],
    { stdio: "inherit", cwd: repoRoot }
  );

  if (result.status !== 0) {
    throw new Error("Connector installer smoke test failed");
  }

  await releaseDistributionComposition.promotionService.markSmokeTestPassed(version);
  console.log(`Smoke test passed for connector release ${version}`);
}

async function runPromote(version: string): Promise<void> {
  await releaseDistributionComposition.promotionService.promote(version);
  console.log(`Promoted connector release ${version}`);
}

async function runActivate(version: string): Promise<void> {
  await releaseDistributionComposition.promotionService.activate(version);
  console.log(`Activated connector release ${version}`);
}

async function main(): Promise<void> {
  const command = process.argv[2];
  const version = resolveVersion();

  switch (command) {
    case "candidate":
      await runCandidate(version);
      return;
    case "publish":
      await runPublish(version);
      return;
    case "verify":
      await runVerify(version);
      return;
    case "smoke-test":
      await runSmokeTest(version);
      return;
    case "promote":
      await runPromote(version);
      return;
    case "activate":
      await runActivate(version);
      return;
    default:
      throw new Error(
        "Usage: connector-release-automation.ts <candidate|publish|verify|smoke-test|promote|activate> [--version <version>]"
      );
  }
}

async function runCli(): Promise<void> {
  try {
    await main();
  } finally {
    await shutdownReleaseDistributionResources();
  }
}

void runCli().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
