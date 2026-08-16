import type { PosTerminal, PosTerminalLifecycle } from "@shared/pos";
import type { CommercialOccupancyTx } from "../../subscription-runtime/commercialLimitOccupancy";

export type PosTerminalStore = {
  listByRestaurant(
    restaurantId: number,
    tx?: CommercialOccupancyTx | null
  ): Promise<PosTerminal[]>;
  getById(
    id: string,
    tx?: CommercialOccupancyTx | null
  ): Promise<PosTerminal | null>;
  getByRestaurantAndCode(
    restaurantId: number,
    code: string,
    tx?: CommercialOccupancyTx | null
  ): Promise<PosTerminal | null>;
  insert(
    terminal: PosTerminal,
    tx?: CommercialOccupancyTx | null
  ): Promise<void>;
  updateLifecycle(
    id: string,
    lifecycle: PosTerminalLifecycle,
    extras?: {
      replacedByTerminalId?: string | null;
      version?: number;
    },
    tx?: CommercialOccupancyTx | null
  ): Promise<PosTerminal | null>;
};
