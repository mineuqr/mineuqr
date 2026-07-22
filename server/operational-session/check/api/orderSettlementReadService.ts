/**
 * ORDER-SETTLEMENT-API-1 — thin read service over Projection store.
 *
 * MUST NOT call Domain, Aggregate, Repository, or materializer rebuild.
 */

import type { OrderSettlementProjectionStore } from "../read/orderSettlementProjectionStore";
import { OrderSettlementProjectionUnavailableError } from "./mapOrderSettlementApiError";
import {
  toOrderSettlementDto,
  toOrderSettlementDtoList,
  toOrderSettlementSummaryDto,
  toProjectionCatalogDto,
} from "./orderSettlementApiMapper";
import type {
  OrderSettlementDto,
  OrderSettlementProjectionCatalogDto,
  OrderSettlementSummaryDto,
} from "./orderSettlementApiDtos";

async function withProjectionStore<T>(
  fn: () => Promise<T>
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof OrderSettlementProjectionUnavailableError) {
      throw error;
    }
    throw new OrderSettlementProjectionUnavailableError(
      error instanceof Error ? error.message : "projection store failed"
    );
  }
}

export class OrderSettlementReadService {
  constructor(private readonly store: OrderSettlementProjectionStore) {}

  async getByOrder(input: {
    restaurantId: number;
    checkId: number;
    orderId: number;
  }): Promise<OrderSettlementDto | null> {
    return withProjectionStore(async () => {
      const row = await this.store.findByIdentity(input);
      return row ? toOrderSettlementDto(row) : null;
    });
  }

  async listByOrder(input: {
    restaurantId: number;
    orderId: number;
  }): Promise<readonly OrderSettlementDto[]> {
    return withProjectionStore(async () => {
      const rows = await this.store.listByRestaurant({
        restaurantId: input.restaurantId,
      });
      return toOrderSettlementDtoList(
        rows.filter((row) => row.orderId === input.orderId)
      );
    });
  }

  async listByCheck(input: {
    restaurantId: number;
    checkId: number;
  }): Promise<readonly OrderSettlementDto[]> {
    return withProjectionStore(async () => {
      const rows = await this.store.listByCheck(input);
      return toOrderSettlementDtoList(rows);
    });
  }

  async listByRestaurant(input: {
    restaurantId: number;
  }): Promise<readonly OrderSettlementDto[]> {
    return withProjectionStore(async () => {
      const rows = await this.store.listByRestaurant(input);
      return toOrderSettlementDtoList(rows);
    });
  }

  async getSummaryByCheck(input: {
    restaurantId: number;
    checkId: number;
  }): Promise<OrderSettlementSummaryDto> {
    return withProjectionStore(async () => {
      const rows = await this.store.listByCheck(input);
      return toOrderSettlementSummaryDto({
        restaurantId: input.restaurantId,
        checkId: input.checkId,
        projections: rows,
      });
    });
  }

  getProjectionCatalog(): OrderSettlementProjectionCatalogDto {
    return toProjectionCatalogDto();
  }
}
