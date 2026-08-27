/**
 * ORDERS-OPERATIONAL-LIFECYCLE-CONSISTENCY-REPAIR-1
 * ORDER-READ-FRESHNESS-SIMPLIFICATION-1 — Phase B
 *
 * Drain deferred Order outbox into the Order Read projection before operational
 * reads (Orders listActive/getDetail, Kitchen getQueue, POS listActive).
 * Does not await relay on place/updateStatus HTTP. Does not write Collection Fact.
 *
 * Bounded drain: one HTTP read must not run an unbounded relay storm.
 * Single-flight: concurrent readers on this process share one in-flight drain.
 * In-memory only — not a DB lock, queue, or Order authority.
 */
const RELAY_BATCH_SIZE = 50;
const MAX_CATCH_UP_BATCHES = 8;

let inflight: Promise<void> | null = null;

async function drainOrderReadProjection(): Promise<void> {
  try {
    const { runOrderEventRelayBatch } = await import(
      "../eventInfrastructureComposition"
    );
    for (let i = 0; i < MAX_CATCH_UP_BATCHES; i += 1) {
      const batch = await runOrderEventRelayBatch(RELAY_BATCH_SIZE);
      if (!batch || batch.processed < RELAY_BATCH_SIZE) break;
    }
  } catch {
    /* Fail open — return the current projection. */
  }
}

export async function catchUpOrderReadProjection(): Promise<void> {
  if (!inflight) {
    inflight = drainOrderReadProjection().finally(() => {
      inflight = null;
    });
  }
  await inflight;
}
