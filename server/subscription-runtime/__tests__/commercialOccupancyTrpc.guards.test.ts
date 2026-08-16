/**
 * COMMERCIAL-OCCUPANCY-ERROR-SEMANTICS-HARDENING-1
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
function read(rel: string) {
  return readFileSync(resolve(root, rel), "utf8");
}

describe("commercial occupancy error semantic guards", () => {
  it("maps occupancy unavailable distinctly from limit exceeded and auth denial", () => {
    const mapper = read("server/subscription-runtime/commercialOccupancyTrpc.ts");
    expect(mapper).toContain("CommercialLimitExceededError");
    expect(mapper).toContain('code: "FORBIDDEN"');
    expect(mapper).toContain("CommercialOccupancyUnavailableError");
    expect(mapper).toContain('code: "INTERNAL_SERVER_ERROR"');
    expect(mapper).toContain("commercial_capacity_unavailable");
    expect(mapper).toContain("COMMERCIAL_OCCUPANCY_UNAVAILABLE_CLIENT_MESSAGE");
    expect(mapper).not.toContain("غير مصرح بالوصول");
    expect(mapper).toContain(
      "if (error instanceof CommercialOccupancyUnavailableError)"
    );
    const unavailableBlock = mapper.slice(
      mapper.indexOf("if (error instanceof CommercialOccupancyUnavailableError)")
    );
    expect(unavailableBlock).toContain('code: "INTERNAL_SERVER_ERROR"');
    expect(unavailableBlock).not.toContain('code: "FORBIDDEN"');
    expect(unavailableBlock).not.toContain("limit_exceeded");
  });

  it("keeps restaurant/category/item and POS consumers on the shared mapper", () => {
    const limits = read("server/subscriptionPlanLimits.ts");
    const pos = read("server/pos/api/posRouter.ts");
    const service = read("server/pos/services/PosTerminalService.ts");
    expect(limits).toContain("throwCommercialOccupancyTrpcError");
    expect(limits).not.toMatch(
      /CommercialOccupancyUnavailableError[\s\S]{0,200}غير مصرح بالوصول/
    );
    expect(pos).toContain("throwCommercialOccupancyTrpcError");
    expect(pos).toContain("CommercialOccupancyUnavailableError");
    expect(service).not.toContain('PosEntitlementDeniedError("occupancy_unavailable")');
    expect(service).not.toContain("new PosEntitlementDeniedError(error.reasonCode)");
  });

  it("does not rewrite occupancy lock or checkLimit semantics", () => {
    const mapper = read("server/subscription-runtime/commercialOccupancyTrpc.ts");
    const occupancy = read("server/subscription-runtime/commercialLimitOccupancy.ts");
    expect(mapper).not.toContain("FOR UPDATE");
    expect(mapper).not.toContain("countOccupancy");
    expect(occupancy).toContain("FOR UPDATE");
    expect(occupancy).toContain("input.decide(proposedTotal)");
  });
});
