/**
 * COMMERCIAL-CATALOG-ADMIN-EXPERIENCE-1 — UX observability (presentation only).
 */

export type CatalogExperienceMetrics = {
  program: "COMMERCIAL-CATALOG-ADMIN-EXPERIENCE-1";
  wizardStarts: number;
  wizardCompletions: number;
  wizardAbandons: number;
  publishDurationsMs: number[];
  validationFailures: number;
  cloneCount: number;
  compareCount: number;
  previewCount: number;
  bulkOpCount: number;
  searchCount: number;
  publicationAttempts: number;
  publicationSuccesses: number;
};

class CatalogExperienceObservability {
  wizardStarts = 0;
  wizardCompletions = 0;
  wizardAbandons = 0;
  publishDurationsMs: number[] = [];
  validationFailures = 0;
  cloneCount = 0;
  compareCount = 0;
  previewCount = 0;
  bulkOpCount = 0;
  searchCount = 0;
  publicationAttempts = 0;
  publicationSuccesses = 0;

  recordWizardStart() {
    this.wizardStarts += 1;
  }
  recordWizardComplete() {
    this.wizardCompletions += 1;
  }
  recordWizardAbandon() {
    this.wizardAbandons += 1;
  }
  recordPublishDuration(ms: number) {
    this.publishDurationsMs.push(ms);
    if (this.publishDurationsMs.length > 50) this.publishDurationsMs.shift();
  }
  recordValidationFailure() {
    this.validationFailures += 1;
  }
  recordClone() {
    this.cloneCount += 1;
  }
  recordCompare() {
    this.compareCount += 1;
  }
  recordPreview() {
    this.previewCount += 1;
  }
  recordBulk() {
    this.bulkOpCount += 1;
  }
  recordSearch() {
    this.searchCount += 1;
  }
  recordPublication(ok: boolean) {
    this.publicationAttempts += 1;
    if (ok) this.publicationSuccesses += 1;
  }

  snapshot(): CatalogExperienceMetrics & {
    wizardCompletionRate: number;
    averagePublishDurationMs: number;
    publicationSuccessRate: number;
  } {
    const avg =
      this.publishDurationsMs.length === 0
        ? 0
        : this.publishDurationsMs.reduce((a, b) => a + b, 0) /
          this.publishDurationsMs.length;
    return {
      program: "COMMERCIAL-CATALOG-ADMIN-EXPERIENCE-1",
      wizardStarts: this.wizardStarts,
      wizardCompletions: this.wizardCompletions,
      wizardAbandons: this.wizardAbandons,
      publishDurationsMs: [...this.publishDurationsMs],
      validationFailures: this.validationFailures,
      cloneCount: this.cloneCount,
      compareCount: this.compareCount,
      previewCount: this.previewCount,
      bulkOpCount: this.bulkOpCount,
      searchCount: this.searchCount,
      publicationAttempts: this.publicationAttempts,
      publicationSuccesses: this.publicationSuccesses,
      wizardCompletionRate:
        this.wizardStarts === 0
          ? 0
          : this.wizardCompletions / this.wizardStarts,
      averagePublishDurationMs: avg,
      publicationSuccessRate:
        this.publicationAttempts === 0
          ? 1
          : this.publicationSuccesses / this.publicationAttempts,
    };
  }
}

export const catalogExperienceObservability =
  new CatalogExperienceObservability();
