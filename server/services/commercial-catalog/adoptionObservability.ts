/**
 * COMMERCIAL-CATALOG-PLATFORM-ADOPTION-1 — adoption observability.
 */

export type CommercialAdoptionMetrics = {
  program: "COMMERCIAL-CATALOG-PLATFORM-ADOPTION-1";
  catalogConsumers: number;
  snapshotCreations: number;
  planAdoptions: number;
  legacyLookupCount: number;
  commercialResolutionErrors: number;
  promotionResolutions: number;
  regionalResolutions: number;
  lastLegacyLookup: string | null;
  lastResolutionError: string | null;
};

class CommercialAdoptionObservability {
  snapshotCreations = 0;
  planAdoptions = 0;
  legacyLookupCount = 0;
  commercialResolutionErrors = 0;
  promotionResolutions = 0;
  regionalResolutions = 0;
  lastLegacyLookup: string | null = null;
  lastResolutionError: string | null = null;

  recordLegacyLookup(source: string) {
    this.legacyLookupCount += 1;
    this.lastLegacyLookup = source;
  }

  recordSnapshotCreated() {
    this.snapshotCreations += 1;
  }

  recordPlanAdoption() {
    this.planAdoptions += 1;
  }

  recordResolutionError(message: string) {
    this.commercialResolutionErrors += 1;
    this.lastResolutionError = message;
  }

  recordPromotionResolution() {
    this.promotionResolutions += 1;
  }

  recordRegionalResolution() {
    this.regionalResolutions += 1;
  }

  snapshot(consumerCount: number): CommercialAdoptionMetrics {
    return {
      program: "COMMERCIAL-CATALOG-PLATFORM-ADOPTION-1",
      catalogConsumers: consumerCount,
      snapshotCreations: this.snapshotCreations,
      planAdoptions: this.planAdoptions,
      legacyLookupCount: this.legacyLookupCount,
      commercialResolutionErrors: this.commercialResolutionErrors,
      promotionResolutions: this.promotionResolutions,
      regionalResolutions: this.regionalResolutions,
      lastLegacyLookup: this.lastLegacyLookup,
      lastResolutionError: this.lastResolutionError,
    };
  }
}

export const commercialAdoptionObservability =
  new CommercialAdoptionObservability();
