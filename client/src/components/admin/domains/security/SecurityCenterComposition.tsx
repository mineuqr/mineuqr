import { adminDash } from "@/components/admin/layout/adminDashStyles";
import { SecurityAuditTimelineSection } from "./SecurityAuditTimelineSection";
import { SecurityHealthSection } from "./SecurityHealthSection";
import { SecurityOverviewSection } from "./SecurityOverviewSection";
import { SecurityProtectedAccountsSection } from "./SecurityProtectedAccountsSection";
import { SecurityRoleChangesSection } from "./SecurityRoleChangesSection";
import { SecuritySubscriptionChangesSection } from "./SecuritySubscriptionChangesSection";
import { SecurityWarningsSection } from "./SecurityWarningsSection";

/** ADMIN-SECURITY-CENTER — Security Center page composition (PR-7 shell + PR-8 audit widgets). */
export function SecurityCenterComposition() {
  return (
    <div className={adminDash.opsWorkspace}>
      <SecurityOverviewSection />
      <SecurityHealthSection />
      <SecurityWarningsSection />
      <SecurityProtectedAccountsSection />

      <div
        className="border-t border-cyan-500/20 pt-2"
        role="separator"
        aria-hidden
      />

      <SecurityAuditTimelineSection />
      <SecurityRoleChangesSection />
      <SecuritySubscriptionChangesSection />
    </div>
  );
}
