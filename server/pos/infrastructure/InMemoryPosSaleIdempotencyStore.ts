import { orderLifecycleNowMs } from "@shared/order-lifecycle-latency";
import { noteOrderLifecyclePhase } from "../../order/observability/orderLifecycleLatency";
import type {
  PosSaleIdempotencyKey,
  PosSaleIdempotencyRecord,
  PosSaleIdempotencyStore,
} from "./PosSaleIdempotencyStore";
import { PosSaleIdempotencyConflictError, PosSaleIdempotencyUniqueCollisionError } from "./posPersistenceErrors";

function key(input: PosSaleIdempotencyKey): string {
  return `${input.restaurantId}:${input.terminalId}:${input.userId}:${input.idempotencyKey}`;
}

export class InMemoryPosSaleIdempotencyStore implements PosSaleIdempotencyStore {
  private readonly rows = new Map<string, PosSaleIdempotencyRecord>();
  private readonly tails = new Map<string, Promise<void>>();

  async get(input: PosSaleIdempotencyKey): Promise<PosSaleIdempotencyRecord | null> {
    return this.rows.get(key(input)) ?? null;
  }

  async put(record: PosSaleIdempotencyRecord): Promise<void> {
    const existing = this.rows.get(key(record));
    if (existing) {
      if (existing.fingerprint !== record.fingerprint) {
        throw new PosSaleIdempotencyConflictError();
      }
      return;
    }
    this.rows.set(key(record), record);
  }

  async putInTransaction(
    _tx: unknown,
    record: PosSaleIdempotencyRecord
  ): Promise<void> {
    const existing = this.rows.get(key(record));
    if (existing) {
      throw new PosSaleIdempotencyUniqueCollisionError();
    }
    this.rows.set(key(record), record);
  }

  async runExclusive<T>(
    input: PosSaleIdempotencyKey,
    fn: () => Promise<T>
  ): Promise<T> {
    const id = key(input);
    const previous = this.tails.get(id) ?? Promise.resolve();
    let release!: () => void;
    const next = new Promise<void>((resolve) => {
      release = resolve;
    });
    this.tails.set(
      id,
      previous.then(() => next)
    );
    // POS-SALE-PERSISTENCE-LATENCY-INSTRUMENTATION-1 — wait only (`await previous`).
    const waitStarted = orderLifecycleNowMs();
    await previous;
    try {
      noteOrderLifecyclePhase(
        "idempotency_wait_ms",
        orderLifecycleNowMs() - waitStarted
      );
    } catch {
      // Observability must not fail exclusive serialization.
    }
    try {
      return await fn();
    } finally {
      release();
    }
  }
}
