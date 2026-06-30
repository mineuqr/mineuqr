import type { PublishedReleaseDownload } from "../domain/PublishedRelease";
import type { ReleaseRegistry } from "../contracts/ReleaseRegistry";
import type { ReleaseStoragePort } from "../contracts/ReleaseStoragePort";

export type ConnectorReleaseDownloadInfo = {
  productName: string;
  version: string;
  downloadUrl: string | null;
  downloadReady: boolean;
  windowsInstallerName: string;
  installerSha256: string | null;
};

export class ReleaseDistributionService {
  constructor(
    private readonly registry: ReleaseRegistry,
    private readonly storage: ReleaseStoragePort
  ) {}

  async getCurrentDownloadInfo(): Promise<ConnectorReleaseDownloadInfo | null> {
    const active = await this.registry.getActiveRelease();
    if (!active) return null;

    const downloadUrl = await this.storage.resolveDownloadUrl(active.storageKey);
    return {
      productName: active.productName,
      version: active.version,
      downloadUrl,
      downloadReady: Boolean(downloadUrl),
      windowsInstallerName: active.installerFileName,
      installerSha256: active.installerSha256,
    };
  }

  async getActivePublishedRelease(): Promise<PublishedReleaseDownload | null> {
    const active = await this.registry.getActiveRelease();
    if (!active) return null;

    const downloadUrl = await this.storage.resolveDownloadUrl(active.storageKey);
    return {
      version: active.version,
      productName: active.productName,
      installerFileName: active.installerFileName,
      installerSha256: active.installerSha256,
      downloadUrl,
      releaseManifest: active.releaseManifest,
    };
  }
}
