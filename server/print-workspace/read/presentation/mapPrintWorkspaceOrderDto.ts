import { resolveFulfilmentProjection } from "@shared/ordering-platform/orderFulfilmentProjection";
import type { orderReadOrders } from "../../../../drizzle/schema";
import type { ActiveOrderLineItemDto } from "../../../order/read/domain/contracts/queryContracts";
import { mapOrderDisplayIdentityFields } from "../../../order/read/presentation/mapOrderDisplayIdentity";
import type { PrintWorkspaceOrderDto } from "../contracts/printWorkspaceQueryContracts";

type OrderRow = typeof orderReadOrders.$inferSelect;

export function mapPrintWorkspaceOrderDto(
  row: OrderRow,
  lineItems: ActiveOrderLineItemDto[]
): PrintWorkspaceOrderDto {
  const identity = mapOrderDisplayIdentityFields({
    orderNumber: row.orderNumber,
    businessDay: row.businessDay ?? null,
    dailyDisplayNumber: row.dailyDisplayNumber ?? null,
    identityScope: row.identityScope ?? null,
    fulfilmentAnchorType: row.fulfilmentAnchorType,
    serviceMode: row.serviceMode,
  });
  const fulfilment = resolveFulfilmentProjection({
    serviceMode: row.serviceMode,
    fulfilmentAnchorType: row.fulfilmentAnchorType,
    fulfilmentLabel: row.fulfilmentLabel,
    tableNumber: row.tableNumber,
    sessionId: row.sessionId,
  });

  return {
    orderId: row.orderId,
    orderNumber: row.orderNumber,
    ...identity,
    status: row.status,
    tableNumber: row.tableNumber,
    sessionId: row.sessionId ?? null,
    serviceMode: fulfilment.serviceMode,
    fulfilmentAnchorType: fulfilment.fulfilmentAnchorType,
    fulfilmentLabel: fulfilment.fulfilmentLabel,
    customerName: row.customerName,
    customerPhone: row.customerPhone,
    notes: row.notes,
    totalAmount: String(row.totalAmount),
    createdAt: row.createdAt,
    readyAt: row.readyAt ?? null,
    servedAt: row.servedAt ?? null,
    isActive: row.isActive,
    lineItems,
  };
}
