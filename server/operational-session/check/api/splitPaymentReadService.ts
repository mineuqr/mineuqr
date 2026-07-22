/**
 * SPLIT-PAYMENT-API-1 — thin read service over Projection store.
 *
 * MUST NOT call Domain, Aggregate, Repository, or materializer rebuild.
 */

import type { SplitPaymentProjectionStore } from "../read/splitPaymentProjectionStore";
import { SplitPaymentProjectionUnavailableError } from "./mapSplitPaymentApiError";
import {
  toSplitPaymentAttemptDto,
  toSplitPaymentAttemptDtoList,
  toSplitPaymentDto,
  toSplitPaymentDtoList,
  toSplitPaymentOutstandingDto,
  toSplitPaymentProjectionCatalogDto,
  toSplitPaymentSummaryDto,
  toSplitPaymentTimelineDto,
} from "./splitPaymentApiMapper";
import type {
  SplitPaymentAttemptDto,
  SplitPaymentDto,
  SplitPaymentOutstandingDto,
  SplitPaymentProjectionCatalogDto,
  SplitPaymentSummaryDto,
  SplitPaymentTimelineDto,
} from "./splitPaymentApiDtos";

async function withProjectionStore<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof SplitPaymentProjectionUnavailableError) {
      throw error;
    }
    throw new SplitPaymentProjectionUnavailableError(
      error instanceof Error ? error.message : "projection store failed"
    );
  }
}

export class SplitPaymentReadService {
  constructor(private readonly store: SplitPaymentProjectionStore) {}

  async getByPayment(input: {
    restaurantId: number;
    checkId: number;
    paymentId: string;
  }): Promise<SplitPaymentDto | null> {
    return withProjectionStore(async () => {
      const row = await this.store.findPaymentByIdentity(input);
      return row ? toSplitPaymentDto(row) : null;
    });
  }

  async listByCheck(input: {
    restaurantId: number;
    checkId: number;
  }): Promise<readonly SplitPaymentDto[]> {
    return withProjectionStore(async () => {
      const rows = await this.store.listPaymentsByCheck(input);
      return toSplitPaymentDtoList(rows);
    });
  }

  async listByRestaurant(input: {
    restaurantId: number;
  }): Promise<readonly SplitPaymentDto[]> {
    return withProjectionStore(async () => {
      const rows = await this.store.listPaymentsByRestaurant(input);
      return toSplitPaymentDtoList(rows);
    });
  }

  async getOutstanding(input: {
    restaurantId: number;
    checkId: number;
  }): Promise<SplitPaymentOutstandingDto | null> {
    return withProjectionStore(async () => {
      const row = await this.store.findOutstandingByIdentity(input);
      return row ? toSplitPaymentOutstandingDto(row) : null;
    });
  }

  async getTimeline(input: {
    restaurantId: number;
    checkId: number;
    paymentId: string;
  }): Promise<SplitPaymentTimelineDto | null> {
    return withProjectionStore(async () => {
      const row = await this.store.findPaymentByIdentity(input);
      return row ? toSplitPaymentTimelineDto(row) : null;
    });
  }

  async getAttemptsByPayment(input: {
    restaurantId: number;
    checkId: number;
    paymentId: string;
  }): Promise<readonly SplitPaymentAttemptDto[]> {
    return withProjectionStore(async () => {
      const rows = await this.store.listAttemptsByPayment(input);
      return toSplitPaymentAttemptDtoList(rows);
    });
  }

  async getAttemptsByCheck(input: {
    restaurantId: number;
    checkId: number;
  }): Promise<readonly SplitPaymentAttemptDto[]> {
    return withProjectionStore(async () => {
      const rows = await this.store.listAttemptsByCheck(input);
      return toSplitPaymentAttemptDtoList(rows);
    });
  }

  async getByAttempt(input: {
    restaurantId: number;
    checkId: number;
    attemptId: string;
  }): Promise<SplitPaymentAttemptDto | null> {
    return withProjectionStore(async () => {
      const row = await this.store.findAttemptByIdentity(input);
      return row ? toSplitPaymentAttemptDto(row) : null;
    });
  }

  async getSummaryByCheck(input: {
    restaurantId: number;
    checkId: number;
  }): Promise<SplitPaymentSummaryDto> {
    return withProjectionStore(async () => {
      const rows = await this.store.listPaymentsByCheck(input);
      return toSplitPaymentSummaryDto({
        restaurantId: input.restaurantId,
        checkId: input.checkId,
        projections: rows,
      });
    });
  }

  getProjectionCatalog(): SplitPaymentProjectionCatalogDto {
    return toSplitPaymentProjectionCatalogDto();
  }
}
