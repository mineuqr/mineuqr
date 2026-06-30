import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

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

  it("release publication is an official pipeline stage", () => {
    const buildScript = readFileSync(join(root, "connector-product/windows/build-release.ps1"), "utf8");
    expect(buildScript).toContain("connector-release-publish.ts");
    expect(buildScript).toContain("connector-release-finalize.mjs");
  });

  it("release registry schema exists", () => {
    const schema = readFileSync(join(root, "drizzle/schema.ts"), "utf8");
    expect(schema).toContain("connector_published_releases");
    expect(schema).toContain("installerSha256");
  });
});
