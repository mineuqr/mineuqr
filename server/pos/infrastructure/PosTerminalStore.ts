import type { PosTerminal, PosTerminalLifecycle } from "@shared/pos";

export type PosTerminalStore = {
  listByRestaurant(restaurantId: number): Promise<PosTerminal[]>;
  getById(id: string): Promise<PosTerminal | null>;
  getByRestaurantAndCode(
    restaurantId: number,
    code: string
  ): Promise<PosTerminal | null>;
  insert(terminal: PosTerminal): Promise<void>;
  updateLifecycle(
    id: string,
    lifecycle: PosTerminalLifecycle,
    extras?: {
      replacedByTerminalId?: string | null;
      version?: number;
    }
  ): Promise<PosTerminal | null>;
};
