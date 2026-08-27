/**
 * ORDERS-OPERATIONAL-LIFECYCLE-CONSISTENCY-REPAIR-1
 * Drain deferred Order outbox into the Order Read projection before listActive/getDetail.
 * Does not await relay on place/updateStatus HTTP. Does not write Collection Fact.
 * Bounded drain: one HTTP list must not run an unbounded relay storm.
 */
const RELAY_BATCH_SIZE = 50;
const MAX_CATCH_UP_BATCHES = 8;

export async function catchUpOrderReadProjection(): Promise<void> {
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
