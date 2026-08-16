import type { PosTerminal, PosTerminalLifecycle } from "@shared/pos";
import type { PosTerminalStore } from "./PosTerminalStore";

export class InMemoryPosTerminalStore implements PosTerminalStore {
  private readonly rows = new Map<string, PosTerminal>();

  async listByRestaurant(
    restaurantId: number,
    _tx?: unknown
  ): Promise<PosTerminal[]> {
    return Array.from(this.rows.values())
      .filter((row) => row.restaurantId === restaurantId)
      .sort((a, b) => a.code.localeCompare(b.code));
  }

  async getById(id: string): Promise<PosTerminal | null> {
    return this.rows.get(id) ?? null;
  }

  async getByRestaurantAndCode(
    restaurantId: number,
    code: string
  ): Promise<PosTerminal | null> {
    return (
      Array.from(this.rows.values()).find(
        (row) => row.restaurantId === restaurantId && row.code === code
      ) ?? null
    );
  }

  async insert(terminal: PosTerminal, _tx?: unknown): Promise<void> {
    this.rows.set(terminal.id, { ...terminal });
  }

  async updateLifecycle(
    id: string,
    lifecycle: PosTerminalLifecycle,
    extras?: { replacedByTerminalId?: string | null; version?: number },
    _tx?: unknown
  ): Promise<PosTerminal | null> {
    const current = this.rows.get(id);
    if (!current) return null;
    const next: PosTerminal = {
      ...current,
      lifecycle,
      replacedByTerminalId:
        extras?.replacedByTerminalId !== undefined
          ? extras.replacedByTerminalId
          : current.replacedByTerminalId,
      version: extras?.version ?? current.version + 1,
      updatedAt: new Date().toISOString(),
    };
    this.rows.set(id, next);
    return next;
  }
}
