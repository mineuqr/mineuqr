import type {
  KitchenQueueQuery,
  KitchenQueueResult,
  KitchenTicketDto,
  KitchenQueueColumns,
} from "../contracts/kitchenQueryContracts";
import {
  buildKitchenReadMeta,
  clampKitchenQueueLimit,
} from "../contracts/kitchenQueryContracts";
import type { QueueOrderingPolicy } from "../domain/ordering/QueueOrderingPolicy";
import { fifoByCreatedAtPolicy } from "../domain/ordering/FifoByCreatedAtPolicy";
import {
  DrizzleOrderReadQueryAdapter,
  type OrderReadQueryPort,
} from "../infrastructure/OrderReadQueryAdapter";
import { KitchenTicketComposer, kitchenTicketComposer } from "./KitchenTicketComposer";

function partitionColumns(tickets: KitchenTicketDto[]): KitchenQueueColumns {
  const columns: KitchenQueueColumns = {
    pending: [],
    preparing: [],
    ready: [],
  };
  for (const ticket of tickets) {
    columns[ticket.status].push(ticket);
  }
  return columns;
}

function countByStatus(tickets: KitchenTicketDto[]) {
  return {
    pending: tickets.filter((t) => t.status === "pending").length,
    preparing: tickets.filter((t) => t.status === "preparing").length,
    ready: tickets.filter((t) => t.status === "ready").length,
  };
}

/**
 * Kitchen Operational Read Context (P-07 logical) — composes tickets from order read projections.
 */
export class KitchenReadService {
  constructor(
    private readonly orderReadPort: OrderReadQueryPort = new DrizzleOrderReadQueryAdapter(),
    private readonly composer: KitchenTicketComposer = kitchenTicketComposer,
    private readonly orderingPolicy: QueueOrderingPolicy = fifoByCreatedAtPolicy
  ) {}

  async getQueue(query: KitchenQueueQuery): Promise<KitchenQueueResult> {
    const started = Date.now();
    const now = new Date();
    const limit = clampKitchenQueueLimit(query.limit);
    const statusFilter = query.status ?? "all";

    const orders = await this.orderReadPort.listPipelineOrders(query.restaurantId);
    const orderIds = orders.map((order) => order.orderId);
    const timelines = await this.orderReadPort.listTimelinesForOrders(
      query.restaurantId,
      orderIds
    );

    const allTickets = this.composer.composeTickets(orders, timelines, now);
    const counts = countByStatus(allTickets);

    const sortedAll = this.orderingPolicy.sort(allTickets, {
      restaurantId: query.restaurantId,
      now,
    });
    const truncated = sortedAll.slice(0, limit);

    const filtered =
      statusFilter === "all"
        ? truncated
        : truncated.filter((ticket) => ticket.status === statusFilter);

    const sortedFiltered = this.orderingPolicy.sort(filtered, {
      restaurantId: query.restaurantId,
      now,
    });

    const columns = partitionColumns(sortedFiltered);
    for (const key of ["pending", "preparing", "ready"] as const) {
      columns[key] = this.orderingPolicy.sort(columns[key], {
        restaurantId: query.restaurantId,
        now,
      });
    }

    const allLineItems = sortedFiltered.flatMap((ticket) => ticket.lineItems);

    return {
      ...buildKitchenReadMeta(now, {
        buildDurationMs: Date.now() - started,
        lineItems: allLineItems,
      }),
      tickets: sortedFiltered,
      columns,
      meta: {
        totalVisible: sortedFiltered.length,
        counts,
      },
    };
  }
}

export const kitchenReadService = new KitchenReadService();
