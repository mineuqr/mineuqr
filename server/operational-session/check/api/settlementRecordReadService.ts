/**
 * SETTLEMENT-RECORD-UI-ADOPTION-1 / REFUND-SETTLEMENT-RECORD-ADOPTION-1
 * REFUND-PRESENTATION-ADOPTION-1 / REFUND-DOCUMENT-NUMBERING-ADOPTION-1
 * Settlement Record read service — polymorphic over recordKind (incl. refund).
 *
 * Reads immutable Settlement Record documents only.
 * Optional order/item/attribution/RF identity enrichment is presentation — not money math.
 */

import {
  sortSettlementRecordsNewestFirst,
  type SettlementRecord,
} from "@shared/operational-session";
import { getOrderById, getOrderItemsByOrderId } from "../../../db";
import { mapOrderDisplayIdentityFields } from "../../../order/read/presentation/mapOrderDisplayIdentity";
import {
  findSettlementRecordById,
  listSettlementRecordsForCheck,
  listSettlementRecordsForRestaurantPaged,
  listSettlementRecordsForSession,
  type SettlementRecordListQuery,
} from "../settlementRecordRepository";
import {
  findRefundDocumentSequenceByRecordId,
  mapRefundDocumentSequencesByRecordIds,
} from "../refundDocumentNumberRepository";
import type {
  SettlementRecordDetailDto,
  SettlementRecordHistoryItemDto,
  SettlementRecordHistoryPageDto,
  SettlementRecordItemSnapshotLineDto,
  SettlementRecordOrderRefDto,
  SettlementRecordReceiptDto,
} from "./settlementRecordApiDtos";
import { loadSettlementRecordAttributionDisplay } from "./settlementRecordAttributionDisplay";
import {
  toSettlementRecordDetailDto,
  toSettlementRecordHistoryItemDto,
  toSettlementRecordReceiptDto,
  withSettlementRecordAttributionDisplay,
} from "./settlementRecordApiMapper";

async function enrichOrders(
  restaurantId: number,
  record: SettlementRecord
): Promise<readonly SettlementRecordOrderRefDto[]> {
  const out: SettlementRecordOrderRefDto[] = [];
  for (const ref of record.orderRefs) {
    try {
      const order = await getOrderById(ref.orderId);
      if (!order || order.restaurantId !== restaurantId) {
        out.push({ orderId: ref.orderId, displayReference: null });
        continue;
      }
      const identity = mapOrderDisplayIdentityFields({
        orderNumber: order.orderNumber,
        businessDay: order.businessDay ?? null,
        dailyDisplayNumber: order.dailyDisplayNumber ?? null,
      });
      out.push({
        orderId: ref.orderId,
        displayReference: identity.displayReference,
      });
    } catch {
      out.push({ orderId: ref.orderId, displayReference: null });
    }
  }
  return out;
}

async function enrichItemsSnapshot(
  restaurantId: number,
  record: SettlementRecord
): Promise<readonly SettlementRecordItemSnapshotLineDto[]> {
  const lines: SettlementRecordItemSnapshotLineDto[] = [];
  for (const ref of record.orderRefs) {
    try {
      const order = await getOrderById(ref.orderId);
      if (!order || order.restaurantId !== restaurantId) continue;
      const items = await getOrderItemsByOrderId(ref.orderId);
      for (const item of items) {
        const name = item.nameEn || item.nameAr || "Item";
        const qty = Number(item.quantity ?? 0);
        const unitPrice = item.price != null ? String(item.price) : null;
        lines.push({
          orderId: ref.orderId,
          name: String(name),
          quantity: qty,
          unitPrice,
          // Display only — grand total remains Settlement Record SSOT.
          lineTotal: null,
        });
      }
    } catch {
      // Skip enrichment failures; Settlement Record money remains authoritative.
    }
  }
  return lines;
}

async function toEnrichedDetail(
  restaurantId: number,
  record: SettlementRecord
): Promise<SettlementRecordDetailDto> {
  const [orders, itemsSnapshot, attribution, refundSequence] = await Promise.all([
    enrichOrders(restaurantId, record),
    enrichItemsSnapshot(restaurantId, record),
    loadSettlementRecordAttributionDisplay({
      restaurantId,
      settlementRecordId: record.settlementRecordId,
    }),
    record.recordKind === "refund"
      ? findRefundDocumentSequenceByRecordId({
          restaurantId,
          settlementRecordId: record.settlementRecordId,
        })
      : Promise.resolve(null),
  ]);
  return withSettlementRecordAttributionDisplay(
    toSettlementRecordDetailDto({
      record,
      orders,
      itemsSnapshot,
      refundSequence,
    }),
    attribution
  );
}

async function toHistoryItems(
  restaurantId: number,
  records: readonly SettlementRecord[]
): Promise<SettlementRecordHistoryItemDto[]> {
  const refundIds = records
    .filter((r) => r.recordKind === "refund")
    .map((r) => r.settlementRecordId);
  const sequenceMap = await mapRefundDocumentSequencesByRecordIds({
    restaurantId,
    settlementRecordIds: refundIds,
  });
  return records.map((record) =>
    toSettlementRecordHistoryItemDto(
      record,
      sequenceMap.get(record.settlementRecordId) ?? null
    )
  );
}

export class SettlementRecordReadService {
  async getById(input: {
    restaurantId: number;
    settlementRecordId: string;
  }): Promise<SettlementRecordDetailDto | null> {
    const record = await findSettlementRecordById(input);
    if (!record) return null;
    return toEnrichedDetail(input.restaurantId, record);
  }

  async getByCheck(input: {
    restaurantId: number;
    checkId: number;
  }): Promise<readonly SettlementRecordDetailDto[]> {
    const records = sortSettlementRecordsNewestFirst(
      await listSettlementRecordsForCheck(input)
    );
    return Promise.all(
      records.map((record) => toEnrichedDetail(input.restaurantId, record))
    );
  }

  async listBySession(input: {
    restaurantId: number;
    sessionId: number;
  }): Promise<readonly SettlementRecordHistoryItemDto[]> {
    const records = sortSettlementRecordsNewestFirst(
      await listSettlementRecordsForSession(input)
    );
    return toHistoryItems(input.restaurantId, records);
  }

  async listByRestaurant(
    input: SettlementRecordListQuery
  ): Promise<SettlementRecordHistoryPageDto> {
    const page = await listSettlementRecordsForRestaurantPaged(input);
    const items = await toHistoryItems(input.restaurantId, page.records);
    return {
      items,
      totalCount: page.totalCount,
      page: page.page,
      pageSize: page.pageSize,
      hasMore: page.page * page.pageSize < page.totalCount,
    };
  }

  async getReceipt(input: {
    restaurantId: number;
    settlementRecordId: string;
  }): Promise<SettlementRecordReceiptDto | null> {
    const detail = await this.getById(input);
    if (!detail) return null;
    return toSettlementRecordReceiptDto(detail);
  }
}

export const settlementRecordReadService = new SettlementRecordReadService();
