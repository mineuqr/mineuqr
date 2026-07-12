import type { RuntimeGetStatusResponse } from "../runtimeTypes";
import { buildStatusReconciliationKey } from "./runtimeReconciliationPolicy";

/**
 * RUNTIME-RECONCILIATION-ARCHITECTURE-1 — orchestration session ledger.
 *
 * Records the last reconciled status key so reconciliation is event-driven
 * (status change) rather than render-driven. Not a boolean guard — the ledger
 * is the reconciliation policy's memory of the last published status event.
 */
export class RuntimeOrchestrationSession {
  private lastStatusKey: string | null = null;

  getLastStatusKey(): string | null {
    return this.lastStatusKey;
  }

  recordStatusKey(statusKey: string): void {
    this.lastStatusKey = statusKey;
  }

  recordStatus(status: RuntimeGetStatusResponse): void {
    this.lastStatusKey = buildStatusReconciliationKey(status);
  }

  reset(): void {
    this.lastStatusKey = null;
  }
}
