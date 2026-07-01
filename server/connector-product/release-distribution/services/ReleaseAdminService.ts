import type { ReleaseRegistry } from "../contracts/ReleaseRegistry";
import {
  canAdministrativelySupersede,
  type PublishedReleaseRecord,
} from "../domain/PublishedRelease";

export class ReleaseAdminService {
  constructor(private readonly registry: ReleaseRegistry) {}

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

    return this.registry.transitionRelease(version, "superseded", new Date().toISOString());
  }
}
