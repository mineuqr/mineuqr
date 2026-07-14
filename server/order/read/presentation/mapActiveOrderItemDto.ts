import { resolveFulfilmentProjection } from "@shared/ordering-platform/orderFulfilmentProjection";
import { resolveOrderDisplayIdentity } from "../../business-identity/application/OrderDisplayIdentityResolver";
import type { ActiveOrderItemDto, ActiveOrderLineItemDto } from "../domain/contracts/queryContracts";

export type OrderRowIdentitySource = {
  orderId: number;
  orderNumber: string;
  businessDay: string | null;
  dailyDisplayNumber: number | null;
  identityScope?: string | null;
  status: string;
  lifecycle: string;
  tableNumber: number;
  sessionId: number | null;
  serviceMode?: string | null;
  fulfilmentAnchorType?: string | null;
  fulfilmentLabel?: string | null;
  customerName: string | null;
  customerPhone: string | null;
  notes: string | null;
  totalAmount: string;
  createdAt: string;
  readyAt: string | null;
  lineItems: ActiveOrderLineItemDto[];
};

export function mapActiveOrderItemDto(row: OrderRowIdentitySource): ActiveOrderItemDto {
  const identity = resolveOrderDisplayIdentity({
    orderNumber: row.orderNumber,
    businessDay: row.businessDay,
    dailyDisplayNumber: row.dailyDisplayNumber,
    identityScope: row.identityScope,
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
    businessDay: row.businessDay,
    dailyDisplayNumber: row.dailyDisplayNumber,
    identityScope: identity.identityScope,
    displayOrderNumber: identity.displayOrderNumber,
    displayReference: identity.displayReference,
    status: row.status,
    lifecycle: row.lifecycle,
    tableNumber: row.tableNumber,
    sessionId: row.sessionId,
    serviceMode: fulfilment.serviceMode,
    fulfilmentAnchorType: fulfilment.fulfilmentAnchorType,
    fulfilmentLabel: fulfilment.fulfilmentLabel,
    customerName: row.customerName,
    customerPhone: row.customerPhone,
    notes: row.notes,
    totalAmount: row.totalAmount,
    createdAt: row.createdAt,
    readyAt: row.readyAt,
    lineItems: row.lineItems,
  };
}
