/**
 * WAITER-ATTACH-MUST-NOT-OPEN-SESSION-1
 *
 * Waiter table selection is binding only:
 *   restaurant + tableId + tableNumber
 *   + read an already-OPEN Session when one exists
 *
 * Must not create a Session, Check, Order, Outbox, or SESSION_OPENED.
 */
import { TRPCError } from "@trpc/server";
import { getTableById } from "../../db";
import { getActiveSession } from "../../diningSession/sessionService";

export type WaiterTableBindResult = {
  restaurantId: number;
  tableId: number;
  tableNumber: number;
  sessionId: number | null;
  sessionToken: string | null;
  sessionStatus: string | null;
  created: false;
  persistence: "persistent";
};

export async function bindWaiterTable(input: {
  restaurantId: number;
  tableId: number;
  tableNumber: number;
}): Promise<WaiterTableBindResult> {
  const table = await getTableById(input.tableId);
  if (
    !table ||
    table.restaurantId !== input.restaurantId ||
    table.tableNumber !== input.tableNumber
  ) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "الطاولة غير موجودة" });
  }

  const active = await getActiveSession({
    restaurantId: input.restaurantId,
    tableId: table.id,
  });

  return {
    restaurantId: input.restaurantId,
    tableId: table.id,
    tableNumber: table.tableNumber,
    sessionId: active?.id ?? null,
    sessionToken: active?.sessionToken ?? null,
    sessionStatus: active?.status ?? null,
    created: false,
    persistence: "persistent",
  };
}
