/**
 * ORDER-PROJECTION-FANOUT-REMEDIATION-1
 * ORDER-PROJECTION-FANOUT-PRE-PRODUCTION-HARDENING-1
 *
 * In-process single-flight for shared Order rematerialization.
 *
 * RA-06 keeps one producing consumer per projection. Those consumers still
 * dispatch in parallel with their own (consumerName, eventId) idempotency.
 * Historic `ensureAssigned` and `persistFromSource` are shared physical work
 * and must run once per eventId while that work is in flight.
 *
 * Failure semantics: the shared promise rejects for every waiter. Consumers
 * that await this work are not marked processed. Sibling consumers that do
 * not enter this gate (P-04, P-06, P-10) are unaffected.
 *
 * Topology contract (process-local, intentional):
 * - This gate is an in-memory Map on one materializer instance.
 * - It is sufficient because live P-01/P-02/P-03/P-11 handlers close over the
 *   composition singleton and run in one `Promise.all` inside
 *   `OrderProjectionConsumerRegistry.dispatchProjections`.
 * - Relay publish is `InProcessEventPublisher` in the same Node process.
 * - This is not a cluster-wide lock. Cross-process overlapping relay remains
 *   outside this gate (Outbox/Relay are not redesigned here).
 * - This is not Redis, not a DB lock, and not SKIP LOCKED.
 */
export class SharedOrderRematerializationGate {
  private readonly inflight = new Map<string, Promise<void>>();

  run(eventId: string, work: () => Promise<void>): Promise<void> {
    const existing = this.inflight.get(eventId);
    if (existing) {
      return existing;
    }
    const run = work().finally(() => {
      this.inflight.delete(eventId);
    });
    this.inflight.set(eventId, run);
    return run;
  }
}
