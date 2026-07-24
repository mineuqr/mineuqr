/**
 * REGISTER-OPERATIONS-UI-1 — architecture guards (presentation only).
 * @vitest-environment node
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(__dirname, "../../../..");

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

describe("REGISTER-OPERATIONS-UI-1 architecture guards", () => {
  it("presentation hooks call only crmp.register.*", () => {
    const q = read(
      "src/lib/register-operations-presentation/useRegisterOperationsQueries.ts"
    );
    const m = read(
      "src/lib/register-operations-presentation/useRegisterOperationsMutations.ts"
    );
    expect(q).toContain("trpc.crmp.register");
    expect(m).toContain("trpc.crmp.register");
    expect(q + m).not.toMatch(/trpc\.(session|order|settlementRecord)\./);
    expect(q + m).not.toMatch(/computeExpectedCash|toCents|grandTotal/);
  });

  it("panel does not invent financial logic or bypass API", () => {
    const panel = read(
      "src/components/register-operations/RegisterOperationsPanel.tsx"
    );
    expect(panel).toContain("REGISTER-OPERATIONS-UI-1");
    expect(panel).toContain("useRegisterOperationsMutations");
    expect(panel).not.toMatch(/computeExpectedCash|toCents|grandTotal/);
    expect(panel).not.toMatch(/from ["']@shared\/crmp/);
  });

  it("dashboard mounts register tab near settlements", () => {
    const types = read("src/components/dashboard/layout/types.ts");
    const dash = read("src/pages/Dashboard.tsx");
    const sidebar = read(
      "src/components/dashboard/layout/RestaurantDashboardSidebar.tsx"
    );
    const url = read("src/lib/dashboardUrl.ts");
    expect(types).toContain('"register"');
    expect(url).toContain("register: \"register\"");
    expect(sidebar).toContain('id: "register"');
    expect(dash).toContain('activeTab === "register"');
    expect(dash).toContain("RegisterOperationsPanel");
  });

  it("does not mount Register Ops on waiter/kiosk/kitchen hosts", () => {
    const waiter = read("src/pages/waiter/WaiterShell.tsx");
    const kiosk = read("src/pages/kiosk/KioskShell.tsx");
    expect(waiter).not.toContain("RegisterOperationsPanel");
    expect(kiosk).not.toContain("RegisterOperationsPanel");
  });
});
