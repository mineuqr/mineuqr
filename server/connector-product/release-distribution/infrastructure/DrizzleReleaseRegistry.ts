import { eq } from "drizzle-orm";
import { connectorPublishedReleases } from "../../../../drizzle/schema";
import { getDb } from "../../../db";
import type {
  PublishedReleaseRecord,
  RegisterPublishedReleaseInput,
} from "../domain/PublishedRelease";
import type { ReleaseRegistry } from "../contracts/ReleaseRegistry";
import { mapRegistryRow } from "./InMemoryReleaseRegistry";

export class DrizzleReleaseRegistry implements ReleaseRegistry {
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

  async activateRelease(version: string, activatedAt: string): Promise<PublishedReleaseRecord | null> {
    const db = await getDb();
    if (!db) throw new Error("Database unavailable");

    const target = await this.findByVersion(version);
    if (!target) return null;

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
}
