import type { SessionLinkedOrderRow } from "../db";

export function computeOrdersTotalAmount(
  orderRows: ReadonlyArray<Pick<SessionLinkedOrderRow, "status" | "totalAmount">>
): string {
  const sum = orderRows.reduce((acc, row) => {
    if (row.status === "cancelled") return acc;
    const amount = Number.parseFloat(String(row.totalAmount ?? "0"));
    return acc + (Number.isFinite(amount) ? amount : 0);
  }, 0);
  return sum.toFixed(2);
}
