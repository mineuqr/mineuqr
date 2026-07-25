/**
 * DATA-RETENTION-PLATFORM-1 — scheduler abstraction.
 * No cron dependency. No domain execution.
 */

import type {
  RetentionFeatureFlags,
  RetentionSchedulerHook,
  RetentionSubjectRef,
} from "../types";
import { DEFAULT_RETENTION_FEATURE_FLAGS } from "../featureFlags";

export type RetentionSchedulerJobKind = RetentionSchedulerHook;

export type RetentionSchedulerJob = Readonly<{
  jobId: string;
  kind: RetentionSchedulerJobKind;
  subject?: RetentionSubjectRef;
  restaurantId?: number;
  dryRun: boolean;
  simulation: boolean;
  enqueuedAt: string;
}>;

export type RetentionSchedulerHookHandler = (
  job: RetentionSchedulerJob
) => Promise<void> | void;

export type RetentionScheduler = {
  on(kind: RetentionSchedulerJobKind, handler: RetentionSchedulerHookHandler): void;
  enqueue(job: Omit<RetentionSchedulerJob, "enqueuedAt"> & { enqueuedAt?: string }): RetentionSchedulerJob;
  runNext(): Promise<RetentionSchedulerJob | null>;
  peek(): readonly RetentionSchedulerJob[];
  clear(): void;
};

export function createRetentionScheduler(options?: {
  flags?: RetentionFeatureFlags;
  now?: () => string;
}): RetentionScheduler {
  const flags = options?.flags ?? DEFAULT_RETENTION_FEATURE_FLAGS;
  const now = options?.now ?? (() => new Date().toISOString());
  const handlers = new Map<
    RetentionSchedulerJobKind,
    RetentionSchedulerHookHandler
  >();
  const queue: RetentionSchedulerJob[] = [];

  function assertHookAllowed(kind: RetentionSchedulerJobKind, dryRun: boolean, simulation: boolean): void {
    if (!flags.drapEnabled || !flags.schedulerEnabled) {
      throw new Error("DRAP scheduler disabled by feature flags");
    }
    if (kind === "archive" && !flags.archiveJobsEnabled && !dryRun && !simulation) {
      throw new Error("Archive jobs disabled (enable flag or use dry_run/simulation)");
    }
    if (kind === "restore" && !flags.restoreJobsEnabled && !dryRun && !simulation) {
      throw new Error("Restore jobs disabled (enable flag or use dry_run/simulation)");
    }
    if (kind === "purge" && !flags.purgeJobsEnabled && !dryRun && !simulation) {
      throw new Error("Purge jobs disabled (enable flag or use dry_run/simulation)");
    }
  }

  return {
    on(kind, handler) {
      handlers.set(kind, handler);
    },
    enqueue(jobInput) {
      const dryRun = jobInput.dryRun || flags.dryRunDefault;
      const simulation = jobInput.simulation || flags.simulationMode;
      assertHookAllowed(jobInput.kind, dryRun, simulation);
      const job: RetentionSchedulerJob = Object.freeze({
        jobId: jobInput.jobId,
        kind: jobInput.kind,
        subject: jobInput.subject,
        restaurantId: jobInput.restaurantId,
        dryRun,
        simulation,
        enqueuedAt: jobInput.enqueuedAt ?? now(),
      });
      queue.push(job);
      return job;
    },
    async runNext() {
      const job = queue.shift() ?? null;
      if (!job) return null;
      const handler = handlers.get(job.kind);
      if (handler) await handler(job);
      return job;
    },
    peek: () => [...queue],
    clear: () => {
      queue.length = 0;
    },
  };
}

/** Convenience: enqueue dry-run archive scan (no domain side effects). */
export function enqueueDryRunArchive(
  scheduler: RetentionScheduler,
  restaurantId: number
): RetentionSchedulerJob {
  return scheduler.enqueue({
    jobId: `dry-run-archive-${restaurantId}-${Date.now()}`,
    kind: "dry_run",
    restaurantId,
    dryRun: true,
    simulation: false,
  });
}

export function enqueueSimulation(
  scheduler: RetentionScheduler,
  restaurantId: number
): RetentionSchedulerJob {
  return scheduler.enqueue({
    jobId: `simulation-${restaurantId}-${Date.now()}`,
    kind: "simulation",
    restaurantId,
    dryRun: true,
    simulation: true,
  });
}
