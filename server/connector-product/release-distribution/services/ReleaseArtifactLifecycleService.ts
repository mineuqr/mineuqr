import type { ReleaseStoragePort } from "../contracts/ReleaseStoragePort";
import type { PublishedReleaseRecord } from "../domain/PublishedRelease";
import { isPendingStorageKey } from "../domain/ReleaseArtifactLifecycle";
import { buildManifestStorageKey } from "./ReleaseManifestEnrichment";

export class ReleaseArtifactLifecycleService {
  constructor(private readonly storage: ReleaseStoragePort) {}

  async retireForSupersededRelease(
    record: PublishedReleaseRecord,
    retiredAt: string
  ): Promise<void> {
    if (isPendingStorageKey(record.storageKey)) {
      return;
    }

    const manifestStorageKey =
      record.releaseManifest.distribution?.manifestStorageKey ??
      buildManifestStorageKey(record.version);

    await this.storage.retireCanonicalArtifacts({
      version: record.version,
      installerFileName: record.installerFileName,
      installerStorageKey: record.storageKey,
      manifestStorageKey,
      retiredAt,
      workflowRunId: record.audit.workflowRunId,
      reason: "superseded",
    });
  }
}
