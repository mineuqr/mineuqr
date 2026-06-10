import type { ReactNode } from "react";
import { OverviewNeedsAttentionSection } from "@/components/admin/domains/customer-success/OverviewNeedsAttentionSection";
import { adminDash } from "@/components/admin/layout/adminDashStyles";
import { OverviewQuickActionsSection } from "@/components/admin/sections/overview/OverviewQuickActionsSection";

type LaunchReadinessOverviewCompositionProps = {
  /** Reports-owned executive snapshot slot. */
  kpiSlot: ReactNode;
};

/**
 * REBUILD-5G — platform command center composition.
 * OCC-MVP — Executive Snapshot → Needs Attention → Quick Actions.
 */
export function LaunchReadinessOverviewComposition({
  kpiSlot,
}: LaunchReadinessOverviewCompositionProps) {
  return (
    <div className={adminDash.opsWorkspace}>
      {kpiSlot}
      <OverviewNeedsAttentionSection />
      <OverviewQuickActionsSection />
    </div>
  );
}
