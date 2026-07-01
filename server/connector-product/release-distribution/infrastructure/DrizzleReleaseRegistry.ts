import { eq } from "drizzle-orm";
import { connectorPublishedReleases } from "../../../../drizzle/schema";
import { getDb } from "../../../db";
import type {
  PublishedReleaseRecord,
  RegisterCandidateInput,
  RegisterPublishedReleaseInput,
  ReleaseAuditContext,
} from "../domain/PublishedRelease";
import { assertReleaseTransition } from "../domain/PublishedRelease";
import type { ReleaseRegistry } from "../contracts/ReleaseRegistry";
import { mapRegistryRow } from "./InMemoryReleaseRegistry";

function emptyManifest(
  version: string,
  productName: string,
  installerFileName: string
): PublishedReleaseRecord["releaseManifest"] {
  return {
    schemaVersion: 2,
    productName,
    version,
    buildDate: new Date(0).toISOString(),
    publisher: "",
    supportUrl: "",
    copyright: "",
    compatibility: {
      minDashboardVersion: "",
      platforms: ["windows"],
    },
    artifacts: [],
    installer: {
      fileName: installerFileName,
      sha256: null,
    },
  };
}

export class DrizzleReleaseRegistry implements ReleaseRegistry {
  async registerCandidate(input: RegisterCandidateInput): Promise<PublishedReleaseRecord> {
    const db = await getDb();
    if (!db) throw new Error("Database unavailable");

    const existing = await this.findByVersion(input.version);
    if (existing && existing.status !== "superseded") {
      if (existing.status === "candidate") {
        return existing;
      }
      throw new Error(`Release ${input.version} is already registered`);
    }

    await db
      .insert(connectorPublishedReleases)
      .values({
        version: input.version,
        productName: input.productName,
        installerFileName: input.installerFileName,
        installerSha256: "pending",
        storageKey: `pending:${input.version}`,
        releaseManifestJson: emptyManifest(input.version, input.productName, input.installerFileName),
        status: "candidate",
        publishedAt: null,
        verifiedAt: null,
        smokeTestPassedAt: null,
        promotedAt: null,
        activatedAt: null,
        gitTag: input.audit.gitTag,
        commitSha: input.audit.commitSha,
        workflowRunId: input.audit.workflowRunId,
        publisher: input.audit.publisher,
      })
      .onDuplicateKeyUpdate({
        set: {
          productName: input.productName,
          installerFileName: input.installerFileName,
          status: "candidate",
          gitTag: input.audit.gitTag,
          commitSha: input.audit.commitSha,
          workflowRunId: input.audit.workflowRunId,
          publisher: input.audit.publisher,
        },
      });

    const saved = await this.findByVersion(input.version);
    if (!saved) throw new Error("Failed to register release candidate");
    return saved;
  }

  async completePublication(input: RegisterPublishedReleaseInput): Promise<PublishedReleaseRecord> {
    const db = await getDb();
    if (!db) throw new Error("Database unavailable");

    const existing = await this.findByVersion(input.version);
    if (!existing) {
      throw new Error(`Release candidate ${input.version} not found`);
    }
    if (existing.status !== "candidate") {
      throw new Error(`Release ${input.version} cannot be published from status ${existing.status}`);
    }

    await db
      .update(connectorPublishedReleases)
      .set({
        productName: input.productName,
        installerFileName: input.installerFileName,
        installerSha256: input.installerSha256,
        storageKey: input.storageKey,
        releaseManifestJson: input.releaseManifest,
        status: "published",
        publishedAt: input.publishedAt,
      })
      .where(eq(connectorPublishedReleases.version, input.version));

    const saved = await this.findByVersion(input.version);
    if (!saved) throw new Error("Failed to complete release publication");
    return saved;
  }

  async registerPublishedRelease(input: RegisterPublishedReleaseInput): Promise<PublishedReleaseRecord> {
    const db = await getDb();
    if (!db) throw new Error("Database unavailable");

    const existing = await this.findByVersion(input.version);
    if (existing && existing.status !== "superseded") {
      throw new Error(`Release ${input.version} is already registered`);
    }

    await db
      .insert(connectorPublishedReleases)
      .values({
        version: input.version,
        productName: input.productName,
        installerFileName: input.installerFileName,
        installerSha256: input.installerSha256,
        storageKey: input.storageKey,
        releaseManifestJson: input.releaseManifest,
        status: "published",
        publishedAt: input.publishedAt,
        activatedAt: null,
      })
      .onDuplicateKeyUpdate({
        set: {
          productName: input.productName,
          installerFileName: input.installerFileName,
          installerSha256: input.installerSha256,
          storageKey: input.storageKey,
          releaseManifestJson: input.releaseManifest,
          status: "published",
          publishedAt: input.publishedAt,
          activatedAt: null,
        },
      });

    const saved = await this.findByVersion(input.version);
    if (!saved) throw new Error("Failed to register published release");
    return saved;
  }

  async findByVersion(version: string): Promise<PublishedReleaseRecord | null> {
    const db = await getDb();
    if (!db) return null;

    const [row] = await db
      .select()
      .from(connectorPublishedReleases)
      .where(eq(connectorPublishedReleases.version, version))
      .limit(1);

    return row ? mapRegistryRow(row) : null;
  }

  async getActiveRelease(): Promise<PublishedReleaseRecord | null> {
    const db = await getDb();
    if (!db) return null;

    const [row] = await db
      .select()
      .from(connectorPublishedReleases)
      .where(eq(connectorPublishedReleases.status, "active"))
      .limit(1);

    return row ? mapRegistryRow(row) : null;
  }

  async transitionRelease(
    version: string,
    nextStatus: PublishedReleaseRecord["status"],
    timestamp: string
  ): Promise<PublishedReleaseRecord> {
    const db = await getDb();
    if (!db) throw new Error("Database unavailable");

    const current = await this.findByVersion(version);
    if (!current) {
      throw new Error(`Release ${version} not found`);
    }

    assertReleaseTransition(current.status, nextStatus);

    const patch: Partial<typeof connectorPublishedReleases.$inferInsert> = {
      status: nextStatus,
    };
    if (nextStatus === "verified") patch.verifiedAt = timestamp;
    if (nextStatus === "smoke_test_passed") patch.smokeTestPassedAt = timestamp;
    if (nextStatus === "promoted") patch.promotedAt = timestamp;

    await db
      .update(connectorPublishedReleases)
      .set(patch)
      .where(eq(connectorPublishedReleases.version, version));

    const saved = await this.findByVersion(version);
    if (!saved) throw new Error(`Failed to transition release ${version}`);
    return saved;
  }

  async activateRelease(version: string, activatedAt: string): Promise<PublishedReleaseRecord | null> {
    const db = await getDb();
    if (!db) throw new Error("Database unavailable");

    const target = await this.findByVersion(version);
    if (!target) return null;
    if (target.status !== "promoted") {
      throw new Error(`Release ${version} must be promoted before activation`);
    }

    await db
      .update(connectorPublishedReleases)
      .set({ status: "superseded" })
      .where(eq(connectorPublishedReleases.status, "active"));

    await db
      .update(connectorPublishedReleases)
      .set({ status: "active", activatedAt })
      .where(eq(connectorPublishedReleases.version, version));

    return this.findByVersion(version);
  }

  async updateAuditContext(version: string, audit: ReleaseAuditContext): Promise<PublishedReleaseRecord | null> {
    const db = await getDb();
    if (!db) throw new Error("Database unavailable");

    await db
      .update(connectorPublishedReleases)
      .set({
        gitTag: audit.gitTag,
        commitSha: audit.commitSha,
        workflowRunId: audit.workflowRunId,
        publisher: audit.publisher,
      })
      .where(eq(connectorPublishedReleases.version, version));

    return this.findByVersion(version);
  }
}
