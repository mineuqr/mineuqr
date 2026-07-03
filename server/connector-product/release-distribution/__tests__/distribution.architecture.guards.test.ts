import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

describe("PRINT-RELEASE-AUTOMATION-1 architecture guards", () => {
  it("official release workflow exists with required stages", () => {
    const workflow = readFileSync(join(root, ".github/workflows/connector-release.yml"), "utf8");
    expect(workflow).toContain("concurrency:");
    expect(workflow).toContain("cancel-in-progress: false");
    expect(workflow).toContain("connector-release-automation.ts candidate");
    expect(workflow).toContain("connector-release-automation.ts publish");
    expect(workflow).toContain("connector-release-automation.ts verify");
    expect(workflow).toContain("connector-release-automation.ts smoke-test");
    expect(workflow).toContain("connector-release-automation.ts promote");
    expect(workflow).toContain("connector-release-automation.ts activate");
    expect(workflow).toContain("actions/attest-build-provenance@v2");
    expect(workflow).toContain("prepare-connector-signing.ps1");
    expect(workflow).toContain("sign-release.ps1");
    expect(workflow).toContain("verify-release-signature.ps1");
    expect(workflow).toContain("-SkipFinalize");
    expect(workflow).toContain("CONNECTOR_SIGNING_PFX_BASE64");
    expect(workflow).toContain("Locate signtool");
  });

  it("admin workflow does not include delete permissions", () => {
    const workflow = readFileSync(join(root, ".github/workflows/connector-release-admin.yml"), "utf8");
    expect(workflow).not.toContain("delete:");
    expect(workflow).not.toContain("R2_SECRET_ACCESS_KEY");
  });

  it("local build script defaults to skip publish", () => {
    const buildScript = readFileSync(join(root, "connector-product/windows/build-release.ps1"), "utf8");
    expect(buildScript).toContain("$SkipPublish = $true");
    expect(buildScript).toContain("connector-release.yml");
  });

  it("distribution manifest supports storage-independent identifiers", () => {
    const types = readFileSync(
      join(root, "server/connector-product/release/connectorReleaseTypes.ts"),
      "utf8"
    );
    expect(types).toContain("installerStorageKey");
    expect(types).toContain("installerArtifactId");
    expect(types).toContain("rollbackTo");
    expect(types).toContain("forceUpdate");
  });

  it("activation requires promoted state", () => {
    const registry = readFileSync(
      join(root, "server/connector-product/release-distribution/infrastructure/InMemoryReleaseRegistry.ts"),
      "utf8"
    );
    expect(registry).toContain('target.status !== "promoted"');
  });

  it("admin supersede uses ReleaseAdminService policy", () => {
    const adminScript = readFileSync(join(root, "scripts/connector-release-admin.ts"), "utf8");
    expect(adminScript).toContain("adminService.administrativelySupersede");
    expect(adminScript).not.toContain("is not the active release");

    const domain = readFileSync(
      join(root, "server/connector-product/release-distribution/domain/PublishedRelease.ts"),
      "utf8"
    );
    expect(domain).toContain('verified: ["smoke_test_passed", "superseded"]');
  });

  it("candidate publication uses registry-derived artifact policy", () => {
    const publication = readFileSync(
      join(root, "server/connector-product/release-distribution/services/ConnectorReleasePublicationService.ts"),
      "utf8"
    );
    expect(publication).toContain("resolveArtifactPublicationPolicy");
    expect(publication).toContain("publicationPolicy");

    const admin = readFileSync(
      join(root, "server/connector-product/release-distribution/services/ReleaseAdminService.ts"),
      "utf8"
    );
    expect(admin).toContain("retireForSupersededRelease");
  });

  it("release automation CLI releases infrastructure resources before exit", () => {
    const automation = readFileSync(join(root, "scripts/connector-release-automation.ts"), "utf8");
    expect(automation).toContain("shutdownReleaseDistributionResources");
    expect(automation).toContain("finally");
    expect(automation).not.toMatch(/process\.exit\s*\(\s*0\s*\)/);
  });

  it("connector bundle stages self-contained runtime dependencies", () => {
    const packageJson = readFileSync(join(root, "package.json"), "utf8");
    expect(packageJson).toContain("stage-connector-runtime-deps.mjs");
    expect(packageJson).toContain("--packages=external");

    const stageScript = readFileSync(join(root, "scripts/stage-connector-runtime-deps.mjs"), "utf8");
    expect(stageScript).toContain('RUNTIME_PACKAGES = ["ws"]');
    expect(stageScript).toContain("dist/connector/node_modules");

    const installer = readFileSync(join(root, "connector-product/windows/MineuQRConnector.iss"), "utf8");
    expect(installer).toContain("dist\\connector\\*");
    expect(installer).toContain("recursesubdirs");
  });

  it("connector installer ships WinSW service host integration", () => {
    const releaseBuild = readFileSync(join(root, "scripts/connector-release-build.mjs"), "utf8");
    expect(releaseBuild).toContain("stage-connector-service-host.mjs");

    const installService = readFileSync(join(root, "connector-product/windows/install-service.ps1"), "utf8");
    expect(installService).toContain("MineuQRConnectorService.exe");
    expect(installService).toContain("MineuQRConnectorService.xml");
    expect(installService).toContain('Invoke-ServiceHost -Exe $ServiceHostExe -Command "install"');

    const installer = readFileSync(join(root, "connector-product/windows/MineuQRConnector.iss"), "utf8");
    expect(installer).toContain("service-host\\MineuQRConnectorService.exe");
  });

  it("connector installer launches STA tray enrollment surface", () => {
    const installer = readFileSync(join(root, "connector-product/windows/MineuQRConnector.iss"), "utf8");
    expect(installer).toContain("-STA -ExecutionPolicy Bypass -File");
    expect(installer).toContain("LaunchConnectorTray");
    expect(installer).toContain("LaunchConnectorTray");

    const tray = readFileSync(join(root, "connector-product/windows/MineuQRConnectorTray.ps1"), "utf8");
    expect(tray).toContain('$InstallDir = Split-Path $PSScriptRoot -Parent');
    expect(tray).not.toContain("Split-Path (Split-Path $PSScriptRoot -Parent) -Parent");
    expect(tray).toContain("Invoke-ConnectorEnrollment");
    expect(tray).toContain('node $enrollScript --token');
    expect(tray).toContain("Show-EnrollmentError");
    expect(tray).toContain("Test-ApartmentState");
  });
});

describe("PRINT-RELEASE-DISTRIBUTION-1 architecture guards", () => {
  it("ConnectorProductService uses release distribution service not env download URL", () => {
    const service = readFileSync(join(root, "server/connector-product/ConnectorProductService.ts"), "utf8");
    expect(service).toContain("releaseDistributionComposition");
    expect(service).toContain("getCurrentDownloadInfo");
    expect(service).not.toContain("MINEUQR_CONNECTOR_DOWNLOAD_URL");
    expect(service).not.toContain("CONNECTOR_DOWNLOAD_URL");
  });

  it("dashboard continues to use getConnectorDownload contract", () => {
    const panel = readFileSync(
      join(root, "client/src/components/print-workspace/ConnectorDownloadPanel.tsx"),
      "utf8"
    );
    expect(panel).toContain("getConnectorDownload");
    expect(panel).toContain("downloadUrl");
  });

  it("release registry schema exists", () => {
    const schema = readFileSync(join(root, "drizzle/schema.ts"), "utf8");
    expect(schema).toContain("connector_published_releases");
    expect(schema).toContain("smoke_test_passed");
    expect(schema).toContain("workflowRunId");
  });
});
