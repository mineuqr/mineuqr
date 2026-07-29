import type { LucideIcon } from "lucide-react";
import {
  Activity,
  ArrowRight,
  BarChart3,
  Bell,
  Building2,
  LineChart,
  Users,
} from "lucide-react";
import { Link } from "wouter";
import { AdminPageSection } from "../AdminPageSection";
import { adminDash } from "@/components/admin/layout/adminDashStyles";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import { operationsTabHref } from "@/pages/admin/operations/operationsTab";

type QuickAction = {
  href: string;
  labelKey: string;
  icon: LucideIcon;
};

const QUICK_ACTIONS: QuickAction[] = [
  {
    href: operationsTabHref("accounts"),
    labelKey: "admin.commandCenter.reviewAccounts",
    icon: Users,
  },
  {
    href: operationsTabHref("tenants"),
    labelKey: "admin.commandCenter.reviewTenants",
    icon: Building2,
  },
  {
    href: operationsTabHref("communications"),
    labelKey: "admin.commandCenter.reviewCommunications",
    icon: Bell,
  },
  {
    href: "/admin/platform",
    labelKey: "admin.commandCenter.openPlatformOps",
    icon: Activity,
  },
  {
    href: "/admin/commercial",
    labelKey: "admin.commandCenter.reviewCommercialHealth",
    icon: LineChart,
  },
  {
    href: "/admin/analytics",
    labelKey: "admin.commandCenter.openAnalytics",
    icon: BarChart3,
  },
];

/** Platform command center — operator intent actions (not navigation tiles). */
export function OverviewQuickActionsSection() {
  const { t } = useLanguage();

  return (
    <AdminPageSection
      title={t("admin.commandCenter.quickActions")}
      description={t("admin.commandCenter.quickActionsDesc")}
      titleVariant="compact"
      spacing="tight"
    >
      <div className={adminDash.operationsCard}>
        <ul className="divide-y divide-border/50">
          {QUICK_ACTIONS.map(({ href, labelKey, icon: Icon }) => (
            <li key={href}>
              <Link
                href={href}
                className={cn(
                  adminDash.opsListRow,
                  "flex items-center gap-2.5 transition-colors hover:bg-slate-800/30"
                )}
              >
                <div className={adminDash.iconContainer}>
                  <Icon className="h-4 w-4" aria-hidden />
                </div>
                <span className="min-w-0 flex-1 text-sm font-medium text-white">
                  {t(labelKey)}
                </span>
                <ArrowRight
                  className="h-4 w-4 shrink-0 text-cyan-400/70"
                  aria-hidden
                />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </AdminPageSection>
  );
}
