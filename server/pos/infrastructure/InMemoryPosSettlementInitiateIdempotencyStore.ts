import type {
  PosSettlementInitiateIdempotencyKey,
  PosSettlementInitiateIdempotencyRecord,
  PosSettlementInitiateIdempotencyStore,
} from "./PosSettlementInitiateIdempotencyStore";

function key(input: PosSettlementInitiateIdempotencyKey): string {
  return `${input.restaurantId}:${input.terminalId}:${input.userId}:${input.idempotencyKey}`;
}

export class InMemoryPosSettlementInitiateIdempotencyStore
  implements PosSettlementInitiateIdempotencyStore
{
  private readonly rows = new Map<string, PosSettlementInitiateIdempotencyRecord>();
  private readonly tails = new Map<string, Promise<void>>();

  async get(
    input: PosSettlementInitiateIdempotencyKey
  ): Promise<PosSettlementInitiateIdempotencyRecord | null> {
    return this.rows.get(key(input)) ?? null;
  }

  async put(record: PosSettlementInitiateIdempotencyRecord): Promise<void> {
    this.rows.set(key(record), record);
  }

  async runExclusive<T>(
    input: PosSettlementInitiateIdempotencyKey,
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