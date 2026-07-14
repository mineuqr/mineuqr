import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("ORDERING-NOTES-ARCHITECTURE-1 architecture guards", () => {
  it("registers shared ordering notes contract ownership", () => {
    const ownership = read("server/ordering-platform/orderingPlatformOwnership.ts");
    expect(ownership).toContain("ORDERING_PLATFORM_NOTES_CONTRACT");
    expect(ownership).toContain("orderingNotesContract.ts");
  });

  it("runtime capabilities include note capabilities", () => {
    const runtime = read("shared/ordering-platform/orderingRuntimeContract.ts");
    expect(runtime).toContain("OrderingNotesCapabilities");
    expect(runtime).toContain("notes: OrderingNotesCapabilities");
    expect(runtime).toContain("orderNotes");
    expect(runtime).toContain("itemNotes");
  });

  it("PlaceOrderService validates notes via shared contract", () => {
    const service = read("server/order/application/PlaceOrderService.ts");
    expect(service).toContain("validateOrderNote");
    expect(service).toContain("validateItemNote");
    expect(service).toContain("@shared/ordering-platform/orderingNotesContract");
  });

  it("QR checkout uses shared note validators — no channel-specific note model", () => {
    const checkout = read("client/src/pages/CheckoutPage.tsx");
    expect(checkout).toContain("validateOrderNote");
    expect(checkout).toContain("validateItemNote");
    expect(checkout).toContain("@shared/ordering-platform/orderingNotesContract");
    expect(checkout).not.toContain("maxOrderNoteLength =");
  });

  it("platform owned concerns include ordering notes", () => {
    const contracts = read("shared/ordering-platform/orderingPlatformContracts.ts");
    expect(contracts).toContain('"ordering_notes"');
    expect(contracts).toContain('"order_notes"');
    expect(contracts).toContain('"item_notes"');
  });

  it("operational line DTO carries itemNotes; ticket retains orderNotes", () => {
    const query = read("server/order/read/domain/contracts/queryContracts.ts");
    const kitchen = read("server/kitchen/read/contracts/kitchenQueryContracts.ts");
    expect(query).toContain("itemNotes");
    expect(kitchen).toContain("orderNotes");
  });
});
