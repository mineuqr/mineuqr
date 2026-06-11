import { adminDash } from "@/components/admin/layout/adminDashStyles";
import { SecurityHealthSection } from "./SecurityHealthSection";
import { SecurityOverviewSection } from "./SecurityOverviewSection";
import { SecurityProtectedAccountsSection } from "./SecurityProtectedAccountsSection";
import { SecurityWarningsSection } from "./SecurityWarningsSection";

/**
 * ADMIN-SECURITY-CENTER PR-7 — Security Center shell composition.
 * Audit timeline / role / subscription sections ship in PR-8.
 */
export function SecurityCenterComposition() {
  return (
    <div className={adminDash.opsWorkspace}>
      <SecurityOverviewSection />
      <SecurityHealthSection />
      <SecurityWarningsSection />
      <SecurityProtectedAccountsSection />
    </div>
  );
}
