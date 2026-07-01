import type { ReleaseRegistry } from "../contracts/ReleaseRegistry";

export class ReleasePromotionService {
  constructor(private readonly registry: ReleaseRegistry) {}

  async markSmokeTestPassed(version: string): Promise<void> {
    const record = await this.registry.findByVersion(version);
    if (!record) {
      throw new Error(`Release ${version} not found`);
    }
    if (record.status !== "verified") {
      throw new Error(`Release ${version} must be verified before smoke test promotion`);
    }
    await this.registry.transitionRelease(version, "smoke_test_passed", new Date().toISOString());
  }

  async promote(version: string): Promise<void> {
    const record = await this.registry.findByVersion(version);
    if (!record) {
      throw new Error(`Release ${version} not found`);
    }
    if (record.status !== "smoke_test_passed") {
      throw new Error(`Release ${version} must pass smoke tests before promotion`);
    }
    await this.registry.transitionRelease(version, "promoted", new Date().toISOString());
  }

  async activate(version: string): Promise<void> {
    const record = await this.registry.findByVersion(version);
    if (!record) {
      throw new Error(`Release ${version} not found`);
    }
    if (record.status !== "promoted") {
      throw new Error(`Release ${version} must be promoted before activation`);
    }
    const activated = await this.registry.activateRelease(version, new Date().toISOString());
    if (!activated) {
      throw new Error(`Failed to activate release ${version}`);
    }
  }
}
