/**
 * MULTI-CHECK-ALLOCATION-API-1 — thin read service over Projection store.
 *
 * MUST NOT call Domain, Aggregate, Repository, or materializer rebuild.
 */

import type { MultiCheckAllocationProjectionStore } from "../read/multiCheckAllocationProjectionStore";
import { MultiCheckAllocationProjectionUnavailableError } from "./mapMultiCheckAllocationApiError";
import {
  toMultiCheckAllocationDto,
  toMultiCheckAllocationDtoList,
  toMultiCheckAllocationProjectionCatalogDto,
  toMultiCheckAllocationResponsibilityDto,
  toMultiCheckAllocationSummaryDto,
  toMultiCheckAllocationSummaryDtoList,
  toMultiCheckAllocationTimelineDto,
} from "./multiCheckAllocationApiMapper";
import type {
  MultiCheckAllocationDto,
  MultiCheckAllocationProjectionCatalogDto,
  MultiCheckAllocationResponsibilityDto,
  MultiCheckAllocationSummaryDto,
  MultiCheckAllocationTimelineDto,
} from "./multiCheckAllocationApiDtos";

async function withProjectionStore<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof MultiCheckAllocationProjectionUnavailableError) {
      throw error;
    }
    throw new MultiCheckAllocationProjectionUnavailableError(
      error instanceof Error ? error.message : "projection store failed"
    );
  }
}

export class MultiCheckAllocationReadService {
  constructor(private readonly store: MultiCheckAllocationProjectionStore) {}

  async getAllocation(input: {
    restaurantId: number;
    allocationId: string;
  }): Promise<MultiCheckAllocationDto | null> {
    return withProjectionStore(async () => {
      const row = await this.store.findAllocationByIdentity(input);
      return row ? toMultiCheckAllocationDto(row) : null;
    });
  }

  async listAllocationsBySourceCheck(input: {
    restaurantId: number;
    sourceCheckId: number;
  }): Promise<readonly MultiCheckAllocationDto[]> {
    return withProjectionStore(async () => {
      const rows = await this.store.listAllocationsBySourceCheck(input);
      return toMultiCheckAllocationDtoList(rows);
    });
  }

  async listAllocationsByTargetCheck(input: {
    restaurantId: number;
    targetCheckId: number;
  }): Promise<readonly MultiCheckAllocationDto[]> {
    return withProjectionStore(async () => {
      const rows = await this.store.listAllocationsByTargetCheck(input);
      return toMultiCheckAllocationDtoList(rows);
    });
  }

  async listAllocationsByRestaurant(input: {
    restaurantId: number;
  }): Promise<readonly MultiCheckAllocationDto[]> {
    return withProjectionStore(async () => {
      const rows = await this.store.listAllocationsByRestaurant(input);
      return toMultiCheckAllocationDtoList(rows);
    });
  }

  async getAllocationSummary(input: {
    restaurantId: number;
    allocationId: string;
  }): Promise<MultiCheckAllocationSummaryDto | null> {
    return withProjectionStore(async () => {
      const row = await this.store.findSummaryByIdentity(input);
      return row ? toMultiCheckAllocationSummaryDto(row) : null;
    });
  }

  async listAllocationSummariesBySourceCheck(input: {
    restaurantId: number;
    sourceCheckId: number;
  }): Promise<readonly MultiCheckAllocationSummaryDto[]> {
    return withProjectionStore(async () => {
      const rows = await this.store.listSummariesBySourceCheck(input);
      return toMultiCheckAllocationSummaryDtoList(rows);
    });
  }

  async getAllocationTimeline(input: {
    restaurantId: number;
    allocationId: string;
  }): Promise<MultiCheckAllocationTimelineDto | null> {
    return withProjectionStore(async () => {
      const row = await this.store.findAllocationByIdentity(input);
      return row ? toMultiCheckAllocationTimelineDto(row) : null;
    });
  }

  async getAllocationResponsibility(input: {
    restaurantId: number;
    allocationId: string;
  }): Promise<MultiCheckAllocationResponsibilityDto | null> {
    return withProjectionStore(async () => {
      const row = await this.store.findAllocationByIdentity(input);
      return row
        ? toMultiCheckAllocationResponsibilityDto(row.responsibility)
        : null;
    });
  }

  getProjectionMetadata(): MultiCheckAllocationProjectionCatalogDto {
    return toMultiCheckAllocationProjectionCatalogDto();
  }
}
