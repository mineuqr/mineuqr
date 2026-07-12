import type { KitchenQueueResult } from "@/lib/kitchen/types";
import { applyKitchenCategoryFilter } from "./applyKitchenCategoryFilter";
import type { CategoryFilterPredicate } from "../category-filter/runtimeCategoryFilterManager";
import {
  classifyKitchenQueueFailure,
  kitchenQueueOperatorMessage,
  type KitchenQueueFailureKind,
} from "./kitchenQueueFailure";
import { normalizeKitchenReadModel, type KitchenRuntimeQueue } from "./kitchenRuntimeReadModel";
import type { CategoryProjectionReadMeta } from "@/lib/kitchen/categoryProjection";

export type KitchenProjectionDiagnostics = CategoryProjectionReadMeta & {
  projectionSchemaVersion: number;
};

export type KitchenRuntimeStream = {
  queue: KitchenRuntimeQueue | null;
  isLoading: boolean;
  isError: boolean;
  isShowingStaleData: boolean;
  failureKind: KitchenQueueFailureKind | null;
  operatorMessage: string | null;
  isFiltered: boolean;
  projectionDiagnostics: KitchenProjectionDiagnostics | null;
};

export function buildKitchenRuntimeStream(input: {
  data: KitchenQueueResult | undefined;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  language: string;
  categoryFilterEnabled: boolean;
  categoryFilterPredicate: CategoryFilterPredicate;
}): KitchenRuntimeStream {
  const failureKind = input.isError ? classifyKitchenQueueFailure(input.error) : null;
  const operatorMessage =
    failureKind != null ? kitchenQueueOperatorMessage(failureKind, input.language) : null;
  const hasData = input.data != null;
  const isShowingStaleData = input.isError && hasData;

  if (!hasData || input.data == null) {
    return {
      queue: null,
      isLoading: input.isLoading,
      isError: input.isError,
      isShowingStaleData: false,
      failureKind,
      operatorMessage,
      isFiltered: false,
      projectionDiagnostics: null,
    };
  }

  const data = input.data;
  const readModel = normalizeKitchenReadModel(data);
  const filtered = applyKitchenCategoryFilter(
    readModel,
    input.categoryFilterPredicate,
    input.categoryFilterEnabled
  );

  return {
    queue: filtered,
    isLoading: input.isLoading,
    isError: input.isError,
    isShowingStaleData,
    failureKind,
    operatorMessage,
    isFiltered: input.categoryFilterEnabled,
    projectionDiagnostics: readModel.projection,
  };
}
