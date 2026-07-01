import type { ReleaseRegistry } from "../contracts/ReleaseRegistry";
import {
  canAdministrativelySupersede,
  type PublishedReleaseRecord,
} from "../domain/PublishedRelease";
import type { ReleaseArtifactLifecycleService } from "./ReleaseArtifactLifecycleService";

export class ReleaseAdminService {
  constructor(
    private readonly registry: ReleaseRegistry,
    private readonly artifactLifecycle: ReleaseArtifactLifecycleService
  ) {}

  async administrativelySupersede(version: string): Promise<PublishedReleaseRecord> {
    const record = await this.registry.findByVersion(version);
    if (!record) {
      throw new Error(`Release ${version} not found`);
    }
    if (record.status === "superseded") {
      throw new Error(`Release ${version} is already superseded`);
    }
    if (!canAdministrativelySupersede(record.status)) {
      throw new Error(
        `Release ${version} cannot be administratively superseded from status ${record.status}`
      );
    }

    const timestamp = new Date().toISOString();
    await this.artifactLifecycle.retireForSupersededRelease(record, timestamp);
    return this.registry.transitionRelease(version, "superseded", timestamp);
  }
}
