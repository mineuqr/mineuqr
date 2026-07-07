import type {
  KitchenPipelineStatus,
  KitchenTicketDto,
  KitchenUrgencyTier,
} from "../contracts/kitchenQueryContracts";
import type {
  OrderReadPipelineOrderRow,
  OrderReadTimelineRow,
} from "../infrastructure/OrderReadQueryAdapter";

export const URGENCY_ELEVATED_SECONDS = 600;
export const URGENCY_CRITICAL_SECONDS = 1200;

export function deriveStatusEnteredAt(
  status: KitchenPipelineStatus,
  createdAt: string,
  timeline: OrderReadTimelineRow[]
): string {
  let latest: string | null = null;
  for (const event of timeline) {
    if (event.toStatus !== status) continue;
    if (!latest || event.occurredAt > latest) {
      latest = event.occurredAt;
    }
  }
  return latest ?? createdAt;
}

export function computeElapsedSeconds(fromIso: string, now: Date): number {
  const fromMs = Date.parse(fromIso.replace(" ", "T"));
  if (!Number.isFinite(fromMs)) return 0;
  return Math.max(0, Math.floor((now.getTime() - fromMs) / 1000));
}

export function computeUrgencyTier(columnElapsedSeconds: number): KitchenUrgencyTier {
  if (columnElapsedSeconds >= URGENCY_CRITICAL_SECONDS) return "critical";
  if (columnElapsedSeconds >= URGENCY_ELEVATED_SECONDS) return "elevated";
  return "normal";
}

export function buildLinesSummary(
  lineItems: OrderReadPipelineOrderRow["lineItems"]
): string {
  return lineItems
    .map((li) => {
      const name = li.nameEn?.trim() || li.nameAr;
      return `${li.quantity}× ${name}`;
    })
    .join(", ");
}

export function buildLineCount(lineItems: OrderReadPipelineOrderRow["lineItems"]): number {
  return lineItems.reduce((sum, li) => sum + li.quantity, 0);
}

export class KitchenTicketComposer {
  composeTicket(
    order: OrderReadPipelineOrderRow,
    timeline: OrderReadTimelineRow[],
    now: Date = new Date()
  ): KitchenTicketDto {
    const statusEnteredAt = deriveStatusEnteredAt(order.status, order.createdAt, timeline);
    const elapsedSeconds = computeElapsedSeconds(order.createdAt, now);
    const columnElapsedSeconds = computeElapsedSeconds(statusEnteredAt, now);

    return {
      orderId: order.orderId,
      orderNumber: order.orderNumber,
      tableNumber: order.tableNumber,
      sessionId: order.sessionId,
      customerName: order.customerName,
      orderNotes: order.notes,
      status: order.status,
      totalAmount: order.totalAmount,
      createdAt: order.createdAt,
      readyAt: order.readyAt,
      statusEnteredAt,
      elapsedSeconds,
      columnElapsedSeconds,
      urgencyTier: computeUrgencyTier(columnElapsedSeconds),
      lineCount: buildLineCount(order.lineItems),
      linesSummary: buildLinesSummary(order.lineItems),
      lineItems: order.lineItems.map((li) => ({ ...li })),
      lastEventId: order.lastEventId,
    };
  }

  composeTickets(
    orders: OrderReadPipelineOrderRow[],
    timelines: Map<number, OrderReadTimelineRow[]>,
    now: Date = new Date()
  ): KitchenTicketDto[] {
    return orders.map((order) =>
      this.composeTicket(order, timelines.get(order.orderId) ?? [], now)
    );
  }
}

export const kitchenTicketComposer = new KitchenTicketComposer();
