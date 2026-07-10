import { resolveOrderDisplayIdentity } from "../../business-identity/application/OrderDisplayIdentityResolver";
import type { ActiveOrderItemDto, ActiveOrderLineItemDto } from "../domain/contracts/queryContracts";

export type OrderRowIdentitySource = {
  orderId: number;
  orderNumber: string;
  businessDay: string | null;
  dailyDisplayNumber: number | null;
  status: string;
  tableNumber: number;
  sessionId: number | null;
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
  });

  return {
    orderId: row.orderId,
    orderNumber: row.orderNumber,
    businessDay: row.businessDay,
    dailyDisplayNumber: row.dailyDisplayNumber,
    displayOrderNumber: identity.displayOrderNumber,
    displayReference: identity.displayReference,
    status: row.status,
    tableNumber: row.tableNumber,
    sessionId: row.sessionId,
    customerName: row.customerName,
    customerPhone: row.customerPhone,
    notes: row.notes,
    totalAmount: row.totalAmount,
    createdAt: row.createdAt,
    readyAt: row.readyAt,
    lineItems: row.lineItems,
  };
}
