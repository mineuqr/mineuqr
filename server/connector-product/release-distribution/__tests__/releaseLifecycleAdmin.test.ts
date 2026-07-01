import { describe, expect, it } from "vitest";
import { InMemoryReleaseRegistry } from "../infrastructure/InMemoryReleaseRegistry";
import { ReleaseAdminService } from "../services/ReleaseAdminService";
import {
  ADMINISTRATIVE_SUPERSEDE_SOURCE_STATUSES,
  RELEASE_STATE_TRANSITIONS,
  assertReleaseTransition,
} from "../domain/PublishedRelease";

function seedVerifiedRelease(registry: InMemoryReleaseRegistry, version = "1.0.0") {
  return registry.registerCandidate({
    version,
    productName: "MineuQR Connector",
    installerFileName: `MineuQR-Connector-${version}-Setup.exe`,
    audit: { gitTag: "main", commitSha: "abc", workflowRunId: "1", publisher: "ops" },
    registeredAt: new Date().toISOString(),
  }).then(async (candidate) => {
    await registry.transitionRelease(version, "published", new Date().toISOString());
    await registry.transitionRelease(version, "verified", new Date().toISOString());
    return registry.findByVersion(version);
  });
}

describe("RELEASE-LIFECYCLE-ADMIN-1", () => {
  it("allows administrative supersede from verified", async () => {
    const registry = new InMemoryReleaseRegistry();
    await seedVerifiedRelease(registry);

    const admin = new ReleaseAdminService(registry);
    const result = await admin.administrativelySupersede("1.0.0");

    expect(result.status).toBe("superseded");
    expect((await registry.findByVersion("1.0.0"))?.status).toBe("superseded");
  });

  it("preserves registry history after administrative supersede", async () => {
    const registry = new InMemoryReleaseRegistry();
    await seedVerifiedRelease(registry);

    const admin = new ReleaseAdminService(registry);
    await admin.administrativelySupersede("1.0.0");

    const record = await registry.findByVersion("1.0.0");
    expect(record).not.toBeNull();
    expect(record?.version).toBe("1.0.0");
    expect(record?.status).toBe("superseded");
    expect(record?.verifiedAt).not.toBeNull();
    expect(record?.audit.workflowRunId).toBe("1");
  });

  it("allows re-registering candidate after administrative supersede", async () => {
    const registry = new InMemoryReleaseRegistry();
    await seedVerifiedRelease(registry);

    const admin = new ReleaseAdminService(registry);
    await admin.administrativelySupersede("1.0.0");

    const reregistered = await registry.registerCandidate({
      version: "1.0.0",
      productName: "MineuQR Connector",
      installerFileName: "MineuQR-Connector-1.0.0-Setup.exe",
      audit: { gitTag: "main", commitSha: "def", workflowRunId: "2", publisher: "ops" },
      registeredAt: new Date().toISOString(),
    });

    expect(reregistered.status).toBe("candidate");
    expect(reregistered.audit.workflowRunId).toBe("2");
  });

  it("still allows superseding active releases", async () => {
    const registry = new InMemoryReleaseRegistry();
    await registry.registerCandidate({
      version: "1.0.0",
      productName: "MineuQR Connector",
      installerFileName: "MineuQR-Connector-1.0.0-Setup.exe",
      audit: { gitTag: "main", commitSha: "abc", workflowRunId: "1", publisher: "ops" },
      registeredAt: new Date().toISOString(),
    });
    const ts = new Date().toISOString();
    await registry.transitionRelease("1.0.0", "published", ts);
    await registry.transitionRelease("1.0.0", "verified", ts);
    await registry.transitionRelease("1.0.0", "smoke_test_passed", ts);
    await registry.transitionRelease("1.0.0", "promoted", ts);
    await registry.activateRelease("1.0.0", ts);

    const active = await registry.getActiveRelease();
    expect(active?.status).toBe("active");

    const admin = new ReleaseAdminService(registry);
    const superseded = await admin.administrativelySupersede("1.0.0");
    expect(superseded.status).toBe("superseded");
    expect(await registry.getActiveRelease()).toBeNull();
  });

  it("rejects superseding an already superseded release", async () => {
    const registry = new InMemoryReleaseRegistry();
    await seedVerifiedRelease(registry);
    const admin = new ReleaseAdminService(registry);
    await admin.administrativelySupersede("1.0.0");

    await expect(admin.administrativelySupersede("1.0.0")).rejects.toThrow(/already superseded/);
  });

  it("documents administrative supersede transitions in domain policy", () => {
    for (const status of ADMINISTRATIVE_SUPERSEDE_SOURCE_STATUSES) {
      expect(() => assertReleaseTransition(status, "superseded")).not.toThrow();
    }
    expect(RELEASE_STATE_TRANSITIONS.verified).toContain("superseded");
    expect(RELEASE_STATE_TRANSITIONS.verified).toContain("smoke_test_passed");
  });
});
