import type { ConnectorDistributionManifest } from "../../release/connectorReleaseTypes";
import type {
  PublishedReleaseRecord,
  RegisterCandidateInput,
  RegisterPublishedReleaseInput,
  ReleaseAuditContext,
} from "../domain/PublishedRelease";
import type { ReleaseRegistry } from "../contracts/ReleaseRegistry";
import { assertReleaseTransition } from "../domain/PublishedRelease";

function emptyManifest(version: string, productName: string, installerFileName: string): ConnectorDistributionManifest {
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

export class InMemoryReleaseRegistry implements ReleaseRegistry {
  private readonly byVersion = new Map<string, PublishedReleaseRecord>();

  async registerCandidate(input: RegisterCandidateInput): Promise<PublishedReleaseRecord> {
    const existing = this.byVersion.get(input.version);
    if (existing && existing.status !== "superseded") {
      if (existing.status === "candidate") {
        return existing;
      }
      throw new Error(`Release ${input.version} is already registered`);
    }

    const record: PublishedReleaseRecord = {
      version: input.version,
      productName: input.productName,
      installerFileName: input.installerFileName,
      installerSha256: "pending",
      storageKey: `pending:${input.version}`,
      releaseManifest: emptyManifest(input.version, input.productName, input.installerFileName),
      status: "candidate",
      publishedAt: null,
      verifiedAt: null,
      smokeTestPassedAt: null,
      promotedAt: null,
      activatedAt: null,
      audit: input.audit,
    };
    this.byVersion.set(input.version, record);
    return record;
  }

  async completePublication(input: RegisterPublishedReleaseInput): Promise<PublishedReleaseRecord> {
    const existing = this.byVersion.get(input.version);
    if (!existing) {
      throw new Error(`Release candidate ${input.version} not found`);
    }
    if (existing.status !== "candidate") {
      throw new Error(`Release ${input.version} cannot be published from status ${existing.status}`);
    }

    const published: PublishedReleaseRecord = {
      ...existing,
      installerSha256: input.installerSha256,
      storageKey: input.storageKey,
      releaseManifest: input.releaseManifest,
      status: "published",
      publishedAt: input.publishedAt,
    };
    this.byVersion.set(input.version, published);
    return published;
  }

  async registerPublishedRelease(input: RegisterPublishedReleaseInput): Promise<PublishedReleaseRecord> {
    const existing = this.byVersion.get(input.version);
    if (existing && existing.status !== "superseded") {
      throw new Error(`Release ${input.version} is already registered`);
    }

    const record: PublishedReleaseRecord = {
      version: input.version,
      productName: input.productName,
      installerFileName: input.installerFileName,
      installerSha256: input.installerSha256,
      storageKey: input.storageKey,
      releaseManifest: input.releaseManifest,
      status: "published",
      publishedAt: input.publishedAt,
      verifiedAt: null,
      smokeTestPassedAt: null,
      promotedAt: null,
      activatedAt: null,
      audit: {
        gitTag: null,
        commitSha: null,
        workflowRunId: null,
        publisher: null,
      },
    };
    this.byVersion.set(input.version, record);
    return record;
  }

  async findByVersion(version: string): Promise<PublishedReleaseRecord | null> {
    return this.byVersion.get(version) ?? null;
  }

  async getActiveRelease(): Promise<PublishedReleaseRecord | null> {
    return Array.from(this.byVersion.values()).find((record) => record.status === "active") ?? null;
  }

  async transitionRelease(
    version: string,
    nextStatus: PublishedReleaseRecord["status"],
    timestamp: string
  ): Promise<PublishedReleaseRecord> {
    const current = this.byVersion.get(version);
    if (!current) {
      throw new Error(`Release ${version} not found`);
    }

    assertReleaseTransition(current.status, nextStatus);

    const updated: PublishedReleaseRecord = {
      ...current,
      status: nextStatus,
      verifiedAt: nextStatus === "verified" ? timestamp : current.verifiedAt,
      smokeTestPassedAt: nextStatus === "smoke_test_passed" ? timestamp : current.smokeTestPassedAt,
      promotedAt: nextStatus === "promoted" ? timestamp : current.promotedAt,
    };
    this.byVersion.set(version, updated);
    return updated;
  }

  async activateRelease(version: string, activatedAt: string): Promise<PublishedReleaseRecord | null> {
    const target = this.byVersion.get(version);
    if (!target) return null;
    if (target.status !== "promoted") {
      throw new Error(`Release ${version} must be promoted before activation`);
    }

    for (const record of Array.from(this.byVersion.values())) {
      if (record.status === "active" && record.version !== version) {
        this.byVersion.set(record.version, { ...record, status: "superseded" });
      }
    }

    const activated: PublishedReleaseRecord = {
      ...target,
      status: "active",
      activatedAt,
    };
    this.byVersion.set(version, activated);
    return activated;
  }

  async updateAuditContext(version: string, audit: ReleaseAuditContext): Promise<PublishedReleaseRecord | null> {
    const current = this.byVersion.get(version);
    if (!current) return null;
    const updated = { ...current, audit };
    this.byVersion.set(version, updated);
    return updated;
  }
}

export function mapRegistryRow(row: {
  version: string;
  productName: string;
  installerFileName: string;
  installerSha256: string;
  storageKey: string;
  releaseManifestJson: unknown;
  status:
    | "candidate"
    | "published"
    | "verified"
    | "smoke_test_passed"
    | "promoted"
    | "active"
    | "superseded";
  publishedAt: string | null;
  verifiedAt: string | null;
  smokeTestPassedAt: string | null;
  promotedAt: string | null;
  activatedAt: string | null;
  gitTag: string | null;
  commitSha: string | null;
  workflowRunId: string | null;
  publisher: string | null;
}): PublishedReleaseRecord {
  return {
    version: row.version,
    productName: row.productName,
    installerFileName: row.installerFileName,
    installerSha256: row.installerSha256,
    storageKey: row.storageKey,
    releaseManifest: row.releaseManifestJson as ConnectorDistributionManifest,
    status: row.status,
    publishedAt: row.publishedAt,
    verifiedAt: row.verifiedAt,
    smokeTestPassedAt: row.smokeTestPassedAt,
    promotedAt: row.promotedAt,
    activatedAt: row.activatedAt,
    audit: {
      gitTag: row.gitTag,
      commitSha: row.commitSha,
      workflowRunId: row.workflowRunId,
      publisher: row.publisher,
    },
  };
}
