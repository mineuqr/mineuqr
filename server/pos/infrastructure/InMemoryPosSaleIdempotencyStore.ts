import type {
  PosSaleIdempotencyKey,
  PosSaleIdempotencyRecord,
  PosSaleIdempotencyStore,
} from "./PosSaleIdempotencyStore";

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
    await previous;
    try {
      return await fn();
    } finally {
      release();
    }
  }
}
