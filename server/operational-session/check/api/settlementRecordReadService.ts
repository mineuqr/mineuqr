/**
 * SETTLEMENT-RECORD-UI-ADOPTION-1 / REFUND-SETTLEMENT-RECORD-ADOPTION-1
 * REFUND-PRESENTATION-ADOPTION-1 / REFUND-DOCUMENT-NUMBERING-ADOPTION-1
 * Settlement Record read service — polymorphic over recordKind (incl. refund).
 *
 * Reads immutable Settlement Record documents only.
 * Optional order/item/attribution/RF identity enrichment is presentation — not money math.
 *
 * RECEIPT-SR-IDENTITY-1 — getReceipt may resolve a current Cashier paid-sale
 * from Collection Fact / orderId. That path is read-only and does not write
 * CF, PAID, or SR. Historical paid and refund receipts remain SR-keyed.
 *
 * RECEIPT-HISTORICAL-FIDELITY-AND-INVOICE-IDENTITY-1
 * Item lines prefer frozen CF composition when a unique production CF exists.
 * Live Order items remain only for historical / no-CF readability.
 */

import {
  sortSettlementRecordsNewestFirst,
  type SettlementRecord,
} from "@shared/operational-session";
import {
  COLLECTION_FACT_PRODUCTION_PURPOSE,
  type CollectionFact,
} from "@shared/operational-session/payment/collection-fact";
import { getOrderById, getOrderItemsByOrderId, getOrdersByIds } from "../../../db";
import { mapOrderDisplayIdentityFields } from "../../../order/read/presentation/mapOrderDisplayIdentity";
import { mapCashierInvoiceNumbersByOrderIds } from "../../../pos/cashier-invoice/cashierInvoiceRepository";
import { listProductionCollectionFactsByOrderId } from "../../payment/collection-fact/collectionFactRepository";
import { receiptItemsFromCollectionFactComposition } from "./receiptItemsFromCollectionFactComposition";
import { settlementSourceChannelFromOrderingChannel } from "./settlementSourceChannel";
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
  withSettlementRecordFinancialIdentity,
  withSettlementRecordHistoryFinancialIdentity,
} from "./settlementRecordApiMapper";
import {
  PaidSaleReceiptIdentityError,
  resolvePaidSaleReceiptFromCollectionFact,
} from "./paidSaleReceiptResolution";

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
        identityScope: order.identityScope ?? null,
        fulfilmentAnchorType: order.fulfilmentAnchorType ?? null,
        serviceMode: order.serviceMode ?? null,
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

async function uniqueProductionCollectionFact(input: {
  restaurantId: number;
  orderId: number;
}): Promise<CollectionFact | "none" | "ambiguous" | "unavailable"> {
  try {
    const facts = await listProductionCollectionFactsByOrderId({
      restaurantId: input.restaurantId,
      orderId: input.orderId,
    });
    const unique = new Map<string, CollectionFact>();
    for (const fact of facts) {
      if (fact.purpose !== COLLECTION_FACT_PRODUCTION_PURPOSE) continue;
      if (fact.restaurantId !== input.restaurantId) continue;
      unique.set(fact.collectionFactId, fact);
    }
    if (unique.size === 0) return "none";
    if (unique.size > 1) return "ambiguous";
    return [...unique.values()][0]!;
  } catch {
    return "unavailable";
  }
}

async function enrichLiveOrderItems(
  restaurantId: number,
  orderId: number
): Promise<readonly SettlementRecordItemSnapshotLineDto[]> {
  const order = await getOrderById(orderId);
  if (!order || order.restaurantId !== restaurantId) return [];
  const items = await getOrderItemsByOrderId(orderId);
  return items.map((item) => ({
    orderId,
    name: String(item.nameEn || item.nameAr || "Item"),
    quantity: Number(item.quantity ?? 0),
    unitPrice: item.price != null ? String(item.price) : null,
    // Display only — grand total remains Settlement Record SSOT.
    lineTotal: null,
  }));
}

async function enrichItemsSnapshot(
  restaurantId: number,
  record: SettlementRecord
): Promise<readonly SettlementRecordItemSnapshotLineDto[]> {
  const lines: SettlementRecordItemSnapshotLineDto[] = [];
  for (const ref of record.orderRefs) {
    try {
      const fact = await uniqueProductionCollectionFact({
        restaurantId,
        orderId: ref.orderId,
      });
      if (fact === "ambiguous" || fact === "unavailable") {
        // Do not fall back to live Order items when CF is present-but-ambiguous
        // or the CF read failed — that would reintroduce silent mutation.
        continue;
      }
      if (fact !== "none") {
        lines.push(...receiptItemsFromCollectionFactComposition(fact));
        continue;
      }
      lines.push(...(await enrichLiveOrderItems(restaurantId, ref.orderId)));
    } catch {
      // Skip enrichment failures; Settlement Record money remains authoritative.
    }
  }
  return lines;
}

async function financialIdentityForOrderIds(
  restaurantId: number,
  orderIds: readonly number[]
): Promise<{ invoiceNumber: string | null; sourceChannel: string | null }> {
  const uniqueIds = [...new Set(orderIds.filter((id) => id > 0))];
  if (uniqueIds.length === 0) {
    return { invoiceNumber: null, sourceChannel: null };
  }
  const [invoices, orders] = await Promise.all([
    mapCashierInvoiceNumbersByOrderIds({ restaurantId, orderIds: uniqueIds }),
    getOrdersByIds(restaurantId, uniqueIds),
  ]);
  let invoiceNumber: string | null = null;
  let sourceChannel: string | null = null;
  for (const orderId of uniqueIds) {
    const serial = invoices.get(orderId);
    if (serial && !invoiceNumber) invoiceNumber = serial;
  }
  for (const order of orders) {
    const channel = settlementSourceChannelFromOrderingChannel(
      order.orderingChannel
    );
    if (channel && !sourceChannel) sourceChannel = channel;
  }
  return { invoiceNumber, sourceChannel };
}

async function toEnrichedDetail(
  restaurantId: number,
  record: SettlementRecord
): Promise<SettlementRecordDetailDto> {
  const [orders, itemsSnapshot, attribution, refundSequence, financialIdentity] =
    await Promise.all([
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
      financialIdentityForOrderIds(
        restaurantId,
        record.orderRefs.map((ref) => ref.orderId)
      ),
    ]);
  return withSettlementRecordFinancialIdentity(
    withSettlementRecordAttributionDisplay(
      toSettlementRecordDetailDto({
        record,
        orders,
        itemsSnapshot,
        refundSequence,
      }),
      attribution
    ),
    financialIdentity
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
  const allOrderIds = records.flatMap((record) =>
    record.orderRefs.map((ref) => ref.orderId)
  );
  const uniqueOrderIds = [...new Set(allOrderIds.filter((id) => id > 0))];
  const [invoices, orders] =
    uniqueOrderIds.length === 0
      ? [new Map<number, string>(), [] as Awaited<ReturnType<typeof getOrdersByIds>>]
      : await Promise.all([
          mapCashierInvoiceNumbersByOrderIds({
            restaurantId,
            orderIds: uniqueOrderIds,
          }),
          getOrdersByIds(restaurantId, uniqueOrderIds),
        ]);
  const channelByOrderId = new Map<number, string>();
  for (const order of orders) {
    const channel = settlementSourceChannelFromOrderingChannel(
      order.orderingChannel
    );
    if (channel) channelByOrderId.set(order.id, channel);
  }
  return records.map((record) => {
    let invoiceNumber: string | null = null;
    let sourceChannel: string | null = null;
    for (const ref of record.orderRefs) {
      const serial = invoices.get(ref.orderId);
      if (serial && !invoiceNumber) invoiceNumber = serial;
      const channel = channelByOrderId.get(ref.orderId);
      if (channel && !sourceChannel) sourceChannel = channel;
    }
    return withSettlementRecordHistoryFinancialIdentity(
      toSettlementRecordHistoryItemDto(
        record,
        sequenceMap.get(record.settlementRecordId) ?? null
      ),
      { invoiceNumber, sourceChannel }
    );
  });
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
    settlementRecordId?: string | null;
    orderId?: number | null;
  }): Promise<SettlementRecordReceiptDto | null> {
    const settlementRecordId = input.settlementRecordId?.trim() ?? "";
    if (settlementRecordId.length > 0) {
      const detail = await this.getById({
        restaurantId: input.restaurantId,
        settlementRecordId,
      });
      if (!detail) return null;
      return toSettlementRecordReceiptDto(detail);
    }
    const orderId = input.orderId ?? null;
    if (orderId != null && Number.isInteger(orderId) && orderId > 0) {
      return resolvePaidSaleReceiptFromCollectionFact({
        restaurantId: input.restaurantId,
        orderId,
      });
    }
    throw new PaidSaleReceiptIdentityError(
      "RECEIPT-SR-IDENTITY-01: settlementRecordId or orderId required"
    );
  }
}

export const settlementRecordReadService = new SettlementRecordReadService();
