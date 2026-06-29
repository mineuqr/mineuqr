import type { OrderLineInput } from "../../orderPricing";
import type { OrderDomainEvent } from "../domain/events/OrderDomainEvents";
import { Order } from "../domain/aggregate/Order";
import type { OrderRepository } from "../repositories/OrderRepository";
import type {
  OrderNumberPort,
  OrderPricingPort,
  TrackingTokenPort,
} from "../domain/ports/OrderPorts";

export type PlaceOrderCommand = {
  restaurantId: number;
  tableId: number;
  tableNumber: number;
  sessionId?: number | null;
  customerName?: string | null;
  customerPhone?: string | null;
  notes?: string | null;
  items: OrderLineInput[];
};

export type PlaceOrderResult = {
  order: Order;
  events: OrderDomainEvent[];
  orderNumber: string;
  trackingToken: string;
  totalAmount: string;
  itemCount: number;
  createdAt: string;
};

export class PlaceOrderService {
  constructor(
    private readonly repository: OrderRepository,
    private readonly pricing: OrderPricingPort,
    private readonly orderNumbers: OrderNumberPort,
    private readonly trackingTokens: TrackingTokenPort
  ) {}

  async execute(command: PlaceOrderCommand): Promise<PlaceOrderResult> {
    const { lines, totalAmount } = await this.pricing.resolveLines(
      command.restaurantId,
      command.items
    );

    const orderNumber = await this.orderNumbers.allocate(command.restaurantId);
    const trackingToken = this.trackingTokens.issue();
    const createdAt = new Date().toISOString();

    const order = Order.placeNew({
      restaurantId: command.restaurantId,
      tableId: command.tableId,
      tableNumber: command.tableNumber,
      sessionId: command.sessionId ?? null,
      customerName: command.customerName ?? null,
      customerPhone: command.customerPhone ?? null,
      notes: command.notes ?? null,
      totalAmount,
      orderNumber,
      trackingToken,
      createdAt,
      lines: lines.map((line) => ({
        menuItemId: line.menuItemId,
        nameAr: line.nameAr,
        nameEn: line.nameEn,
        unitPrice: line.price,
        quantity: line.quantity,
        notes: line.notes,
      })),
    });

    let events: OrderDomainEvent[] = [];
    const { order: persisted } = await this.repository.save(order, {
      onPersisted: (p) => {
        p.recordCreated(p.id!);
        events = p.pullDomainEvents();
        return events;
      },
    });
    persisted.clearDomainEvents();

    const itemCount = lines.reduce((sum, line) => sum + line.quantity, 0);

    return {
      order: persisted,
      events,
      orderNumber,
      trackingToken,
      totalAmount,
      itemCount,
      createdAt,
    };
  }
}
