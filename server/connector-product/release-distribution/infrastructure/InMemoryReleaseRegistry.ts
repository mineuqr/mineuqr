import type {
  PublishedReleaseRecord,
  RegisterPublishedReleaseInput,
} from "../domain/PublishedRelease";
import type { ReleaseRegistry } from "../contracts/ReleaseRegistry";
import type { ConnectorDistributionManifest } from "../../release/connectorReleaseTypes";

export class InMemoryReleaseRegistry implements ReleaseRegistry {
  private readonly byVersion = new Map<string, PublishedReleaseRecord>();

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
      activatedAt: null,
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

  async activateRelease(version: string, activatedAt: string): Promise<PublishedReleaseRecord | null> {
    const target = this.byVersion.get(version);
    if (!target) return null;

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
}

export function mapRegistryRow(row: {
  version: string;
  productName: string;
  installerFileName: string;
  installerSha256: string;
  storageKey: string;
  releaseManifestJson: unknown;
  status: "published" | "active" | "superseded";
  publishedAt: string;
  activatedAt: string | null;
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
    activatedAt: row.activatedAt ?? null,
  };
}
