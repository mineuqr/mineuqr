import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { buildPublicUrl, normalizeKey } from "../../../storage/shared";
import { ENV } from "../../../_core/env";
import { UPLOADS_DIR } from "../../../local-uploads";
import type {
  PublishReleaseArtifactInput,
  PublishedStorageArtifact,
  ReleaseStoragePort,
  VerifiedStorageArtifact,
} from "../contracts/ReleaseStoragePort";

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

function installerStorageKey(version: string, installerFileName: string): string {
  return normalizeKey(path.posix.join("connector-releases", version, installerFileName));
}

function manifestStorageKey(version: string): string {
  return normalizeKey(path.posix.join("connector-releases", version, "release-manifest.json"));
}

async function assertArtifactNotExists(localPath: string): Promise<void> {
  try {
    await access(localPath);
    throw new Error(`Immutable release artifact already exists at ${localPath}`);
  } catch (error) {
    if (error instanceof Error && error.message.includes("Immutable release artifact")) {
      throw error;
    }
  }
}

export class LocalFilesystemReleaseStorage implements ReleaseStoragePort {
  async publishReleaseArtifacts(input: PublishReleaseArtifactInput): Promise<PublishedStorageArtifact> {
    const installerKey = installerStorageKey(input.version, input.installerFileName);
    const manifestKey = manifestStorageKey(input.version);

    const installerData = await readFile(input.localInstallerPath);
    const manifestData = await readFile(input.localManifestPath);

    const installerDest = path.join(UPLOADS_DIR, installerKey);
    const manifestDest = path.join(UPLOADS_DIR, manifestKey);
    await assertArtifactNotExists(installerDest);
    await assertArtifactNotExists(manifestDest);

    await import("node:fs/promises").then(async (fs) => {
      await fs.mkdir(path.dirname(installerDest), { recursive: true });
      await fs.mkdir(path.dirname(manifestDest), { recursive: true });
      await fs.writeFile(installerDest, installerData);
      await fs.writeFile(manifestDest, manifestData);
    });

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
    try {
      await access(filePath);
      return { storageKey: normalizeKey(storageKey), exists: true };
    } catch {
      return { storageKey: normalizeKey(storageKey), exists: false };
    }
  }
}

export class R2ReleaseStorage implements ReleaseStoragePort {
  async publishReleaseArtifacts(input: PublishReleaseArtifactInput): Promise<PublishedStorageArtifact> {
    const { r2StorageHead, r2StoragePut } = await import("../../../storage/r2-provider");
    const installerKey = installerStorageKey(input.version, input.installerFileName);
    const manifestKey = manifestStorageKey(input.version);

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
