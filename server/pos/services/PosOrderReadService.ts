/**
 * POS-READ-APIS-IMPLEMENTATION-1
 * POS consumer of Order Read Platform. POS does not own Order projections.
 */

import type { SelectUser } from "../../../drizzle/schema";
import type {
  ActiveOrderListResult,
  OrderTimelineResult,
} from "../../order/read/domain/contracts/queryContracts";
import { OrderReadWorkspaceService } from "../../order/read/services/OrderReadWorkspaceService";
import type { PosPermissionGrantStore } from "../infrastructure/PosPermissionGrantStore";
import { PosAccessService } from "./PosAccessService";
import { PosReadError } from "./PosReadError";
import { requirePosReadContext } from "./requirePosReadContext";

export type PosOrderReadCommand = {
  restaurantId: number;
  terminalId: string;
};

export class PosOrderReadService {
  constructor(
    private readonly grants: PosPermissionGrantStore,
    private readonly access: PosAccessService,
    private readonly orders: OrderReadWorkspaceService
  ) {}

  async listActive(input: {
    user: SelectUser;
    command: PosOrderReadCommand & {
      status?: "pending" | "preparing" | "ready" | "all-active";
      limit?: number;
      cursor?: string | null;
    };
  }): Promise<ActiveOrderListResult> {
    const context = await requirePosReadContext(this.access, this.grants, {
      user: input.user,
      restaurantId: input.command.restaurantId,
      terminalId: input.command.terminalId,
      procedure: "pos.read.orders.listActive",
    });
    return this.orders.listActive({
      restaurantId: context.restaurantId,
      status: input.command.status,
      limit: input.command.limit,
      cursor: input.command.cursor,
    });
  }

  async getDetail(input: {
    user: SelectUser;
    command: PosOrderReadCommand & { orderId: number };
  }) {
    const context = await requirePosReadContext(this.access, this.grants, {
      user: input.user,
      restaurantId: input.command.restaurantId,
      terminalId: input.command.terminalId,
      procedure: "pos.read.orders.getDetail",
    });
    const detail = await this.orders.getDetail({
      restaurantId: context.restaurantId,
      orderId: input.command.orderId,
    });
    if (!detail) {
      throw new PosReadError("not_found", "Order not found");
    }
    return detail;
  }

  async getTimeline(input: {
    user: SelectUser;
    command: PosOrderReadCommand & { orderId: number };
  }): Promise<OrderTimelineResult> {
    const context = await requirePosReadContext(this.access, this.grants, {
      user: input.user,
      restaurantId: input.command.restaurantId,
      terminalId: input.command.terminalId,
      procedure: "pos.read.orders.getTimeline",
    });
    const timeline = await this.orders.getTimeline({
      restaurantId: context.restaurantId,
      orderId: input.command.orderId,
    });
    if (!timeline) {
      throw new PosReadError("not_found", "Order timeline not found");
    }
    return timeline;
  }
}
