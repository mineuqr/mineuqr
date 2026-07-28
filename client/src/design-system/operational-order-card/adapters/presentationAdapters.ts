/**
 * OPERATIONAL-ORDER-CARD-PLATFORM-1
 * Thin presentation adapters — map feature DTOs → OrderPresentationModel.
 * No business logic, no API changes.
 */
import {
  mapActiveOrderPresentation,
  type ActiveOrderPresentationSource,
  type OrderPresentationModel,
} from "@/lib/order-presentation";

export type WaiterOrderPresentationSource = {
  orderId: number;
  displayReference: string;
  status: string;
  createdAt: string;
  notes: string | null;
  totalAmount: string;
  lineItems: readonly {
    lineItemId: number;
    nameAr: string;
    nameEn: string | null;
    quantity: number;
    price: string;
    itemNotes: string | null;
    modifiers: readonly string[];
  }[];
};

/**
 * Waiter workspace orders lack full ActiveOrder DTO — inject table fulfilment defaults.
 */
export function mapWaiterOrderPresentation(
  order: WaiterOrderPresentationSource,
  options: { tableNumber: number; now?: Date }
): {
  presentation: OrderPresentationModel;
  linePrices: ReadonlyMap<number, string>;
} {
  const tableNumber = options.tableNumber;
  const fulfilmentLabel = String(tableNumber);
  const source: ActiveOrderPresentationSource = {
    orderId: order.orderId,
    orderNumber: order.displayReference,
    displayReference: order.displayReference,
    businessDay: null,
    dailyDisplayNumber: null,
    status: order.status,
    lifecycle: "active",
    tableNumber,
    serviceMode: "dine_in",
    fulfilmentAnchorType: "table",
    fulfilmentLabel,
    customerName: null,
    customerPhone: null,
    notes: order.notes,
    totalAmount: order.totalAmount,
    createdAt: order.createdAt,
    lineItems: order.lineItems.map((line) => ({
      lineItemId: line.lineItemId,
      quantity: line.quantity,
      nameAr: line.nameAr,
      nameEn: line.nameEn,
      itemNotes: line.itemNotes,
      modifiers: line.modifiers,
    })),
  };

  const presentation = mapActiveOrderPresentation(source, {
    tableUnit: "table",
    now: options.now,
    availableActions: [],
  });

  const linePrices = new Map(
    order.lineItems.map((line) => [line.lineItemId, line.price] as const)
  );

  return { presentation, linePrices };
}

export type DashboardOrderPresentationSource = {
  id: number;
  orderNumber?: string;
  displayReference?: string;
  businessDay?: string | null;
  dailyDisplayNumber?: number | null;
  status: string;
  lifecycle?: string;
  tableNumber?: number;
  serviceMode?: string;
  fulfilmentAnchorType?: string;
  fulfilmentLabel?: string;
  customerName?: string | null;
  customerPhone?: string | null;
  notes?: string | null;
  totalAmount?: string;
  createdAt?: string;
  items?: readonly {
    id: number;
    quantity: number;
    nameAr: string;
    nameEn?: string | null;
    price?: string;
    itemNotes?: string | null;
    modifiers?: readonly string[] | null;
  }[];
};

export function mapDashboardOrderPresentation(
  order: DashboardOrderPresentationSource,
  options?: { tableUnit?: "table" | "room"; now?: Date }
): {
  presentation: OrderPresentationModel;
  linePrices: ReadonlyMap<number, string>;
} {
  const items = order.items ?? [];
  const source: ActiveOrderPresentationSource = {
    orderId: order.id,
    orderNumber: order.orderNumber ?? order.displayReference ?? String(order.id),
    displayReference: order.displayReference,
    businessDay: order.businessDay ?? null,
    dailyDisplayNumber: order.dailyDisplayNumber ?? null,
    status: order.status,
    lifecycle: order.lifecycle ?? "active",
    tableNumber: order.tableNumber ?? 0,
    serviceMode: order.serviceMode ?? "dine_in",
    fulfilmentAnchorType: order.fulfilmentAnchorType ?? "table",
    fulfilmentLabel: order.fulfilmentLabel ?? String(order.tableNumber ?? ""),
    customerName: order.customerName ?? null,
    customerPhone: order.customerPhone ?? null,
    notes: order.notes ?? null,
    totalAmount: order.totalAmount ?? "",
    createdAt: order.createdAt ?? new Date(0).toISOString(),
    lineItems: items.map((line) => ({
      lineItemId: line.id,
      quantity: line.quantity,
      nameAr: line.nameAr,
      nameEn: line.nameEn,
      itemNotes: line.itemNotes ?? null,
      modifiers: line.modifiers ?? [],
    })),
  };

  const presentation = mapActiveOrderPresentation(source, {
    tableUnit: options?.tableUnit ?? "table",
    now: options?.now,
    availableActions: [],
  });

  const linePrices = new Map<number, string>();
  for (const line of items) {
    if (line.price != null) {
      const qty = Number(line.quantity) || 0;
      const unit = Number.parseFloat(line.price);
      if (Number.isFinite(unit)) {
        linePrices.set(line.id, (unit * qty).toFixed(2));
      } else {
        linePrices.set(line.id, line.price);
      }
    }
  }

  return { presentation, linePrices };
}
