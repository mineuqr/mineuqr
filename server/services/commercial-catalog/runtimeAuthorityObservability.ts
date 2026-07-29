/**
 * COMMERCIAL-SNAPSHOT-RUNTIME-AUTHORITY-1 — runtime resolution observability.
 * Mixed Resolution Count MUST remain 0 (no overlay/merge path).
 */

export type CommercialRuntimeAuthorityMetrics = {
  program: "COMMERCIAL-SNAPSHOT-RUNTIME-AUTHORITY-1";
  snapshotResolutionCount: number;
  legacyBridgeCount: number;
  /** Architecture invariant — must always be 0. */
  mixedResolutionCount: number;
  snapshotBindingCoverageChecks: number;
  snapshotBoundPresent: number;
  snapshotCreationFailures: number;
  legacyBridgeConsumers: string[];
  lastLegacyBridgeConsumer: string | null;
  lastSnapshotResolve: string | null;
  lastCreationFailure: string | null;
};

class CommercialRuntimeAuthorityObservability {
  snapshotResolutionCount = 0;
  legacyBridgeCount = 0;
  /** Never incremented — overlay path removed. */
  readonly mixedResolutionCount = 0;
  snapshotBindingCoverageChecks = 0;
  snapshotBoundPresent = 0;
  snapshotCreationFailures = 0;
  legacyBridgeConsumers = new Set<string>();
  lastLegacyBridgeConsumer: string | null = null;
  lastSnapshotResolve: string | null = null;
  lastCreationFailure: string | null = null;

  recordSnapshotResolved(subscriptionId: number) {
    this.snapshotResolutionCount += 1;
    this.lastSnapshotResolve = `subscription:${subscriptionId}`;
  }

  recordLegacyBridgeUsed(consumer: string) {
    this.legacyBridgeCount += 1;
    this.legacyBridgeConsumers.add(consumer);
    this.lastLegacyBridgeConsumer = consumer;
  }

  recordBindingCoverage(bound: boolean) {
    this.snapshotBindingCoverageChecks += 1;
    if (bound) this.snapshotBoundPresent += 1;
  }

  recordSnapshotCreationFailure(reason: string) {
    this.snapshotCreationFailures += 1;
    this.lastCreationFailure = reason;
  }

  snapshot(): CommercialRuntimeAuthorityMetrics {
    return {
      program: "COMMERCIAL-SNAPSHOT-RUNTIME-AUTHORITY-1",
      snapshotResolutionCount: this.snapshotResolutionCount,
      legacyBridgeCount: this.legacyBridgeCount,
      mixedResolutionCount: this.mixedResolutionCount,
      snapshotBindingCoverageChecks: this.snapshotBindingCoverageChecks,
      snapshotBoundPresent: this.snapshotBoundPresent,
      snapshotCreationFailures: this.snapshotCreationFailures,
      legacyBridgeConsumers: [...this.legacyBridgeConsumers].sort(),
      lastLegacyBridgeConsumer: this.lastLegacyBridgeConsumer,
      lastSnapshotResolve: this.lastSnapshotResolve,
      lastCreationFailure: this.lastCreationFailure,
    };
  }

  resetForTests() {
    this.snapshotResolutionCount = 0;
    this.legacyBridgeCount = 0;
    this.snapshotBindingCoverageChecks = 0;
    this.snapshotBoundPresent = 0;
    this.snapshotCreationFailures = 0;
    this.legacyBridgeConsumers.clear();
    this.lastLegacyBridgeConsumer = null;
    this.lastSnapshotResolve = null;
    this.lastCreationFailure = null;
  }
}

export const commercialRuntimeAuthorityObservability =
  new CommercialRuntimeAuthorityObservability();
