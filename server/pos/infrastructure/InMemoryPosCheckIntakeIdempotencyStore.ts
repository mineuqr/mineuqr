import type {
  PosCheckIntakeIdempotencyKey,
  PosCheckIntakeIdempotencyRecord,
  PosCheckIntakeIdempotencyStore,
} from "./PosCheckIntakeIdempotencyStore";

function key(input: PosCheckIntakeIdempotencyKey): string {
  return `${input.restaurantId}:${input.terminalId}:${input.userId}:${input.idempotencyKey}`;
}

export class InMemoryPosCheckIntakeIdempotencyStore
  implements PosCheckIntakeIdempotencyStore
{
  private readonly rows = new Map<string, PosCheckIntakeIdempotencyRecord>();
  private readonly tails = new Map<string, Promise<void>>();

  async get(
    input: PosCheckIntakeIdempotencyKey
  ): Promise<PosCheckIntakeIdempotencyRecord | null> {
    return this.rows.get(key(input)) ?? null;
  }

  async put(record: PosCheckIntakeIdempotencyRecord): Promise<void> {
    this.rows.set(key(record), record);
  }

  async runExclusive<T>(
    input: PosCheckIntakeIdempotencyKey,
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
