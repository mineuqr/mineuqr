/**
 * POS-READ-APIS-IMPLEMENTATION-1
 * POS consumer of Order Settlement Projection. POS does not own Settlement.
 * Does not compute Revenue, tax, or grandTotal.
 */

import type { SelectUser } from "../../../drizzle/schema";
import type { OrderSettlementDto } from "../../operational-session/check/api/orderSettlementApiDtos";
import { OrderSettlementReadService } from "../../operational-session/check/api/orderSettlementReadService";
import type { PosPermissionGrantStore } from "../infrastructure/PosPermissionGrantStore";
import { PosAccessService } from "./PosAccessService";
import { requirePosReadContext } from "./requirePosReadContext";

export class PosOrderSettlementReadService {
  constructor(
    private readonly grants: PosPermissionGrantStore,
    private readonly access: PosAccessService,
    private readonly settlements: OrderSettlementReadService
  ) {}

  async listByOrder(input: {
    user: SelectUser;
    command: { restaurantId: number; terminalId: string; orderId: number };
  }): Promise<readonly OrderSettlementDto[]> {
    const context = await requirePosReadContext(this.access, this.grants, {
      user: input.user,
      restaurantId: input.command.restaurantId,
      terminalId: input.command.terminalId,
      procedure: "pos.read.orderSettlement.listByOrder",
    });
    return this.settlements.listByOrder({
      restaurantId: context.restaurantId,
      orderId: input.command.orderId,
    });
  }
}
