/**
 * THERMAL-PRINTING-12A — category → station → printer routing (V1).
 *
 * Assignment remains printer-aware only; this layer resolves printer targets per station.
 */
import type { SelectOrderItem } from "../../drizzle/schema";
import {
  autoPrintDefaultStationJobIdempotencyKey,
  autoPrintJobIdempotencyKey,
  autoPrintStationJobIdempotencyKey,
} from "../../shared/printing/types";
import { getOrderItemsByOrderId } from "../db";
import { resolvePrintTarget } from "./printTargetSelectionService";
import { findPrinterById } from "./printerRepository";
import {
  findPrintStationById,
  getCategoryStationIds,
  getMenuItemsByIds,
  listPrintStationsForRestaurant,
} from "./stationRepository";
import {
  STATION_ROUTING_REASONS,
  type ResolveStationPrintTargetsResult,
  type StationPrintTarget,
  StationRoutingError,
} from "./stationRoutingTypes";

type ItemStationGroup = {
  stationId: number | null;
  orderItemIds: number[];
};

export type StationItemFilterMode = "all" | "station" | "default";

async function buildOrderItemStationMap(input: {
  restaurantId: number;
  orderItems: SelectOrderItem[];
}): Promise<Map<number, number | null>> {
  const menuItemIds = Array.from(new Set(input.orderItems.map((item) => item.menuItemId)));
  const menuItems = await getMenuItemsByIds(menuItemIds);
  const menuItemById = new Map(menuItems.map((item) => [item.id, item]));
  const categoryIds = Array.from(
    new Set(
      menuItems
        .filter((item) => item.restaurantId === input.restaurantId)
        .map((item) => item.categoryId)
    )
  );
  const categoryStationMap = await getCategoryStationIds(input.restaurantId, categoryIds);

  const orderItemStationMap = new Map<number, number | null>();
  for (const orderItem of input.orderItems) {
    const menuItem = menuItemById.get(orderItem.menuItemId);
    if (!menuItem || menuItem.restaurantId !== input.restaurantId) {
      orderItemStationMap.set(orderItem.id, null);
      continue;
    }
    orderItemStationMap.set(orderItem.id, categoryStationMap.get(menuItem.categoryId) ?? null);
  }
  return orderItemStationMap;
}

function groupOrderItemsByStation(
  itemStationPairs: Array<{ orderItemId: number; stationId: number | null }>
): ItemStationGroup[] {
  const groups = new Map<number | null, number[]>();
  for (const pair of itemStationPairs) {
    const bucket = groups.get(pair.stationId) ?? [];
    bucket.push(pair.orderItemId);
    groups.set(pair.stationId, bucket);
  }

  return Array.from(groups.entries()).map(([stationId, orderItemIds]) => ({
    stationId,
    orderItemIds: orderItemIds.sort((left, right) => left - right),
  }));
}

function sortGroupsDeterministically(
  groups: ItemStationGroup[],
  stationSortOrder: Map<number, number>
): ItemStationGroup[] {
  return [...groups].sort((left, right) => {
    if (left.stationId == null && right.stationId == null) return 0;
    if (left.stationId == null) return 1;
    if (right.stationId == null) return -1;
    const leftOrder = stationSortOrder.get(left.stationId) ?? left.stationId;
    const rightOrder = stationSortOrder.get(right.stationId) ?? right.stationId;
    if (leftOrder !== rightOrder) return leftOrder - rightOrder;
    return left.stationId - right.stationId;
  });
}

function buildIdempotencyKey(orderId: number, stationId: number | null, multiTarget: boolean): string {
  if (!multiTarget) {
    return autoPrintJobIdempotencyKey(orderId);
  }
  if (stationId == null) {
    return autoPrintDefaultStationJobIdempotencyKey(orderId);
  }
  return autoPrintStationJobIdempotencyKey(orderId, stationId);
}

export async function resolveStationPrintTargets(input: {
  restaurantId: number;
  orderId: number;
}): Promise<ResolveStationPrintTargetsResult> {
  const orderItems = await getOrderItemsByOrderId(input.orderId);
  if (orderItems.length === 0) {
    throw new StationRoutingError("Order has no items");
  }

  const stations = await listPrintStationsForRestaurant(input.restaurantId);
  const stationById = new Map(stations.map((station) => [station.id, station]));
  const stationSortOrder = new Map(stations.map((station) => [station.id, station.sortOrder]));

  const orderItemStationMap = await buildOrderItemStationMap({
    restaurantId: input.restaurantId,
    orderItems,
  });

  const itemStationPairs = orderItems.map((orderItem) => ({
    orderItemId: orderItem.id,
    stationId: orderItemStationMap.get(orderItem.id) ?? null,
  }));

  const groups = sortGroupsDeterministically(
    groupOrderItemsByStation(itemStationPairs),
    stationSortOrder
  );
  const multiTarget = groups.length > 1;

  const targets: StationPrintTarget[] = [];
  const skipped: ResolveStationPrintTargetsResult["skipped"] = [];

  for (const group of groups) {
    if (group.stationId != null) {
      const station = stationById.get(group.stationId) ?? (await findPrintStationById(group.stationId));
      if (!station || station.restaurantId !== input.restaurantId) {
        skipped.push({
          stationId: group.stationId,
          stationName: null,
          orderItemIds: group.orderItemIds,
          reason: "category-station-not-found",
        });
        continue;
      }

      const printer = await findPrinterById(station.printerId);
      if (!printer || printer.restaurantId !== input.restaurantId) {
        skipped.push({
          stationId: station.id,
          stationName: station.name,
          orderItemIds: group.orderItemIds,
          reason: "station-printer-missing",
        });
        continue;
      }

      targets.push({
        stationId: station.id,
        stationName: station.name,
        printerId: station.printerId,
        orderItemIds: group.orderItemIds,
        idempotencyKey: buildIdempotencyKey(input.orderId, station.id, multiTarget),
        selectionReason: STATION_ROUTING_REASONS.STATION_PRINTER,
      });
      continue;
    }

    try {
      const defaultTarget = await resolvePrintTarget({ restaurantId: input.restaurantId });
      targets.push({
        stationId: null,
        stationName: null,
        printerId: defaultTarget.dbPrinterId,
        orderItemIds: group.orderItemIds,
        idempotencyKey: buildIdempotencyKey(input.orderId, null, multiTarget),
        selectionReason: multiTarget
          ? STATION_ROUTING_REASONS.DEFAULT_PRINTER
          : STATION_ROUTING_REASONS.LEGACY_SINGLE_TARGET,
      });
    } catch (error) {
      skipped.push({
        stationId: null,
        stationName: null,
        orderItemIds: group.orderItemIds,
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  if (targets.length === 0 && skipped.length > 0) {
    throw new StationRoutingError(
      skipped.map((entry) => entry.reason).join("; ") || "No printable station targets"
    );
  }

  return { targets, skipped };
}

export async function filterOrderItemsForStationJob(input: {
  restaurantId: number;
  orderItems: SelectOrderItem[];
  stationId: number | null;
  filterMode: StationItemFilterMode;
}): Promise<SelectOrderItem[]> {
  if (input.filterMode === "all") {
    return input.orderItems;
  }

  const orderItemStationMap = await buildOrderItemStationMap({
    restaurantId: input.restaurantId,
    orderItems: input.orderItems,
  });

  return input.orderItems.filter((orderItem) => {
    const itemStationId = orderItemStationMap.get(orderItem.id) ?? null;
    if (input.filterMode === "default") {
      return itemStationId == null;
    }
    return itemStationId === input.stationId;
  });
}

export function resolveStationItemFilterFromJob(input: {
  orderId: number;
  stationId: number | null | undefined;
  idempotencyKey: string;
}): { stationId: number | null; filterMode: StationItemFilterMode } {
  if (input.idempotencyKey === autoPrintJobIdempotencyKey(input.orderId)) {
    return { stationId: null, filterMode: "all" };
  }
  if (input.idempotencyKey === autoPrintDefaultStationJobIdempotencyKey(input.orderId)) {
    return { stationId: null, filterMode: "default" };
  }
  const stationMatch = input.idempotencyKey.match(/^order:\d+:submitted:station:(\d+)$/);
  if (stationMatch) {
    return { stationId: Number(stationMatch[1]), filterMode: "station" };
  }
  if (input.stationId != null) {
    return { stationId: input.stationId, filterMode: "station" };
  }
  return { stationId: null, filterMode: "all" };
}
