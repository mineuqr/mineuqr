import { createHash } from "node:crypto";
import { access, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { buildPublicUrl, normalizeKey } from "../../../storage/shared";
import { ENV } from "../../../_core/env";
import { UPLOADS_DIR } from "../../../local-uploads";
import type {
  PublishReleaseArtifactInput,
  PublishedStorageArtifact,
  ReleaseStoragePort,
  RetireCanonicalArtifactsInput,
  RetiredCanonicalArtifacts,
  VerifiedStorageArtifact,
} from "../contracts/ReleaseStoragePort";
import {
  buildArchivedInstallerKey,
  buildArchivedManifestKey,
} from "../domain/ReleaseArtifactLifecycle";
import {
  buildInstallerStorageKey,
  buildManifestStorageKey,
} from "../services/ReleaseManifestEnrichment";

function resolveLocalPublicBaseUrl(): string {
  const configured =
    process.env.PUBLIC_APP_URL?.trim() ||
    process.env.MINEUQR_PUBLIC_API_URL?.trim() ||
    "";
  if (!configured) {
    throw new Error(
      "PUBLIC_APP_URL or MINEUQR_PUBLIC_API_URL is required for local connector release distribution"
    );
  }
  return configured.replace(/\/$/, "");
}

function sha256Buffer(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function moveLocalArtifact(sourceKey: string, destKey: string): Promise<boolean> {
  const sourcePath = path.join(UPLOADS_DIR, normalizeKey(sourceKey));
  const destPath = path.join(UPLOADS_DIR, normalizeKey(destKey));
  if (!(await fileExists(sourcePath))) {
    return false;
  }
  await mkdir(path.dirname(destPath), { recursive: true });
  await rename(sourcePath, destPath);
  return true;
}

async function retireLocalCanonicalArtifacts(
  input: RetireCanonicalArtifactsInput
): Promise<RetiredCanonicalArtifacts | null> {
  const archivedInstallerKey = buildArchivedInstallerKey(
    input.version,
    input.installerFileName,
    input.retiredAt,
    input.workflowRunId,
    input.reason
  );
  const archivedManifestKey = buildArchivedManifestKey(
    input.version,
    input.retiredAt,
    input.workflowRunId,
    input.reason
  );

  const installerMoved = await moveLocalArtifact(input.installerStorageKey, archivedInstallerKey);
  const manifestMoved = await moveLocalArtifact(input.manifestStorageKey, archivedManifestKey);
  if (!installerMoved && !manifestMoved) {
    return null;
  }
  return { archivedInstallerKey, archivedManifestKey };
}

export class LocalFilesystemReleaseStorage implements ReleaseStoragePort {
  async retireCanonicalArtifacts(
    input: RetireCanonicalArtifactsInput
  ): Promise<RetiredCanonicalArtifacts | null> {
    return retireLocalCanonicalArtifacts(input);
  }

  async publishReleaseArtifacts(input: PublishReleaseArtifactInput): Promise<PublishedStorageArtifact> {
    const installerKey = buildInstallerStorageKey(input.version, input.installerFileName);
    const manifestKey = buildManifestStorageKey(input.version);
    const policy = input.publicationPolicy ?? "immutable";

    if (policy === "reclaim-canonical") {
      await this.retireCanonicalArtifacts({
        version: input.version,
        installerFileName: input.installerFileName,
        installerStorageKey: installerKey,
        manifestStorageKey: manifestKey,
        retiredAt: new Date().toISOString(),
        workflowRunId: null,
        reason: "canonical-reclaim",
      });
    } else {
      const installerDest = path.join(UPLOADS_DIR, installerKey);
      const manifestDest = path.join(UPLOADS_DIR, manifestKey);
      if (await fileExists(installerDest)) {
        throw new Error(`Immutable release installer already exists at ${installerKey}`);
      }
      if (await fileExists(manifestDest)) {
        throw new Error(`Immutable release manifest already exists at ${manifestKey}`);
      }
    }

    const installerData = await readFile(input.localInstallerPath);
    const manifestData = await readFile(input.localManifestPath);
    const installerDest = path.join(UPLOADS_DIR, installerKey);
    const manifestDest = path.join(UPLOADS_DIR, manifestKey);
    await mkdir(path.dirname(installerDest), { recursive: true });
    await mkdir(path.dirname(manifestDest), { recursive: true });
    await writeFile(installerDest, installerData);
    await writeFile(manifestDest, manifestData);

    const baseUrl = resolveLocalPublicBaseUrl();
    return {
      storageKey: installerKey,
      installerUrl: `${baseUrl}/uploads/${installerKey}`,
      manifestStorageKey: manifestKey,
      manifestUrl: `${baseUrl}/uploads/${manifestKey}`,
    };
  }

  async resolveDownloadUrl(storageKey: string): Promise<string> {
    const baseUrl = resolveLocalPublicBaseUrl();
    return `${baseUrl}/uploads/${normalizeKey(storageKey)}`;
  }

  async verifyInstallerArtifact(
    storageKey: string,
    expectedSha256: string
  ): Promise<VerifiedStorageArtifact> {
    const filePath = path.join(UPLOADS_DIR, normalizeKey(storageKey));
    const body = await readFile(filePath);
    const sha256 = sha256Buffer(body);
    if (sha256 !== expectedSha256) {
      throw new Error(`Installer checksum mismatch for ${storageKey}`);
    }
    return { storageKey: normalizeKey(storageKey), sha256, sizeBytes: body.length };
  }

  async verifyManifestArtifact(storageKey: string): Promise<{ storageKey: string; exists: boolean }> {
    const filePath = path.join(UPLOADS_DIR, normalizeKey(storageKey));
    return { storageKey: normalizeKey(storageKey), exists: await fileExists(filePath) };
  }
}

async function retireR2CanonicalArtifacts(
  input: RetireCanonicalArtifactsInput
): Promise<RetiredCanonicalArtifacts | null> {
  const { r2StorageHead, r2StorageGetObject, r2StoragePut, r2StorageDelete } = await import(
    "../../../storage/r2-provider"
  );

  const archivedInstallerKey = buildArchivedInstallerKey(
    input.version,
    input.installerFileName,
    input.retiredAt,
    input.workflowRunId,
    input.reason
  );
  const archivedManifestKey = buildArchivedManifestKey(
    input.version,
    input.retiredAt,
    input.workflowRunId,
    input.reason
  );

  let installerArchived = false;
  let manifestArchived = false;

  try {
    await r2StorageHead(input.installerStorageKey);
    const installer = await r2StorageGetObject(input.installerStorageKey);
    await r2StoragePut(
      archivedInstallerKey,
      installer.body,
      "application/vnd.microsoft.portable-executable"
    );
    await r2StorageDelete(input.installerStorageKey);
    installerArchived = true;
  } catch {
    // not at canonical key
  }

  try {
    await r2StorageHead(input.manifestStorageKey);
    const manifest = await r2StorageGetObject(input.manifestStorageKey);
    await r2StoragePut(archivedManifestKey, manifest.body, "application/json");
    await r2StorageDelete(input.manifestStorageKey);
    manifestArchived = true;
  } catch {
    // not at canonical key
  }

  if (!installerArchived && !manifestArchived) {
    return null;
  }
  return { archivedInstallerKey, archivedManifestKey };
}

export class R2ReleaseStorage implements ReleaseStoragePort {
  async retireCanonicalArtifacts(
    input: RetireCanonicalArtifactsInput
  ): Promise<RetiredCanonicalArtifacts | null> {
    return retireR2CanonicalArtifacts(input);
  }

  async publishReleaseArtifacts(input: PublishReleaseArtifactInput): Promise<PublishedStorageArtifact> {
    const { r2StorageHead, r2StoragePut } = await import("../../../storage/r2-provider");
    const installerKey = buildInstallerStorageKey(input.version, input.installerFileName);
    const manifestKey = buildManifestStorageKey(input.version);
    const policy = input.publicationPolicy ?? "immutable";

    if (policy === "reclaim-canonical") {
      await this.retireCanonicalArtifacts({
        version: input.version,
        installerFileName: input.installerFileName,
        installerStorageKey: installerKey,
        manifestStorageKey: manifestKey,
        retiredAt: new Date().toISOString(),
        workflowRunId: null,
        reason: "canonical-reclaim",
      });
    } else {
      try {
        await r2StorageHead(installerKey);
        throw new Error(`Immutable release installer already exists at ${installerKey}`);
      } catch (error) {
        if (error instanceof Error && error.message.includes("Immutable release installer")) {
          throw error;
        }
      }
      try {
        await r2StorageHead(manifestKey);
        throw new Error(`Immutable release manifest already exists at ${manifestKey}`);
      } catch (error) {
        if (error instanceof Error && error.message.includes("Immutable release manifest")) {
          throw error;
        }
      }
    }

    const installerData = await readFile(input.localInstallerPath);
    const manifestData = await readFile(input.localManifestPath);
    const installer = await r2StoragePut(
      installerKey,
      installerData,
      "application/vnd.microsoft.portable-executable"
    );
    const manifest = await r2StoragePut(manifestKey, manifestData, "application/json");

    return {
      storageKey: installer.key,
      installerUrl: installer.url,
      manifestStorageKey: manifest.key,
      manifestUrl: manifest.url,
    };
  }

  async resolveDownloadUrl(storageKey: string): Promise<string> {
    if (ENV.r2PublicBaseUrl) {
      return buildPublicUrl(ENV.r2PublicBaseUrl, storageKey);
    }
    const { storageGet } = await import("../../../storage");
    const resolved = await storageGet(storageKey);
    return resolved.url;
  }

  async verifyInstallerArtifact(
    storageKey: string,
    expectedSha256: string
  ): Promise<VerifiedStorageArtifact> {
    const { r2StorageGetObject } = await import("../../../storage/r2-provider");
    const object = await r2StorageGetObject(storageKey);
    const sha256 = sha256Buffer(object.body);
    if (sha256 !== expectedSha256) {
      throw new Error(`Installer checksum mismatch for ${storageKey}`);
    }
    return { storageKey: object.key, sha256, sizeBytes: object.body.length };
  }

  async verifyManifestArtifact(storageKey: string): Promise<{ storageKey: string; exists: boolean }> {
    const { r2StorageHead } = await import("../../../storage/r2-provider");
    try {
      await r2StorageHead(storageKey);
      return { storageKey: normalizeKey(storageKey), exists: true };
    } catch {
      return { storageKey: normalizeKey(storageKey), exists: false };
    }
  }
}

function hasR2Config(): boolean {
  return Boolean(
    ENV.r2AccessKeyId &&
      ENV.r2SecretAccessKey &&
      ENV.r2BucketName &&
      ENV.r2PublicBaseUrl &&
      ENV.r2Endpoint
  );
}

export function createReleaseStorage(): ReleaseStoragePort {
  if (hasR2Config()) {
    return new R2ReleaseStorage();
  }
  return new LocalFilesystemReleaseStorage();
}
