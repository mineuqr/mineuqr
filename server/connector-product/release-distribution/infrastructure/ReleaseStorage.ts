import { readFile } from "node:fs/promises";
import path from "node:path";
import { buildPublicUrl, normalizeKey } from "../../../storage/shared";
import { ENV } from "../../../_core/env";
import { UPLOADS_DIR } from "../../../local-uploads";
import type {
  PublishReleaseArtifactInput,
  PublishedStorageArtifact,
  ReleaseStoragePort,
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

export class LocalFilesystemReleaseStorage implements ReleaseStoragePort {
  async publishReleaseArtifacts(input: PublishReleaseArtifactInput): Promise<PublishedStorageArtifact> {
    const installerKey = normalizeKey(
      path.posix.join("connector-releases", input.version, input.installerFileName)
    );
    const manifestKey = normalizeKey(
      path.posix.join("connector-releases", input.version, "release-manifest.json")
    );

    const installerData = await readFile(input.localInstallerPath);
    const manifestData = await readFile(input.localManifestPath);

    const installerDest = path.join(UPLOADS_DIR, installerKey);
    const manifestDest = path.join(UPLOADS_DIR, manifestKey);
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
}

export class R2ReleaseStorage implements ReleaseStoragePort {
  async publishReleaseArtifacts(input: PublishReleaseArtifactInput): Promise<PublishedStorageArtifact> {
    const { storagePut } = await import("../../../storage");
    const installerKey = normalizeKey(
      path.posix.join("connector-releases", input.version, input.installerFileName)
    );
    const manifestKey = normalizeKey(
      path.posix.join("connector-releases", input.version, "release-manifest.json")
    );

    const installerData = await readFile(input.localInstallerPath);
    const manifestData = await readFile(input.localManifestPath);

    const installer = await storagePut(
      installerKey,
      installerData,
      "application/vnd.microsoft.portable-executable"
    );
    const manifest = await storagePut(manifestKey, manifestData, "application/json");

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
