import type { ReactNode } from "react";
import { Link } from "wouter";
import { Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import { ADMIN_WORKSPACE_DIR, adminDash } from "./adminDashStyles";
import { AdminDashboardSidebar } from "./AdminDashboardSidebar";
import {
  AdminShellBreadcrumbs,
  type AdminBreadcrumbItem,
} from "./AdminShellBreadcrumbs";

/**
 * ADMIN-RTL-WORKSPACE — operator console uses LTR workspace geometry.
 * Document `html[dir]` may stay RTL for tenant surfaces; Arabic copy remains
 * RTL via language strings inside this frame. Sidebar stays physical left.
 */

export type AdminOperationsShellProps = {
  children: ReactNode;
  title: string;
  subtitle?: string;
  breadcrumbs?: AdminBreadcrumbItem[];
  headerActions?: ReactNode;
  /** Optional status strip below header (alerts, readiness, etc.). */
  statusIndicator?: ReactNode;
  /** UX-REFINE-1 — tighter header/main for operations-style pages. */
  compact?: boolean;
  /** UX-REFINE-1A — narrower centered content (max-w-5xl) for operations console. */
  narrowContent?: boolean;
  /** UX-REFINE-1B — tabs / secondary nav directly under title */
  headerFooter?: ReactNode;
  className?: string;
};

export function AdminOperationsShell({
  children,
  title,
  subtitle,
  breadcrumbs = [],
  headerActions,
  statusIndicator,
  compact = false,
  narrowContent = false,
  headerFooter,
  className,
}: AdminOperationsShellProps) {
  const { language } = useLanguage();
  const crumbTrail: AdminBreadcrumbItem[] =
    breadcrumbs.length > 0
      ? breadcrumbs
      : [{ label: title }];

  const contentMax = narrowContent ? adminDash.opsShellMax : "mx-auto w-full max-w-7xl";

  return (
    <SidebarProvider defaultOpen>
      <div
        className={cn(adminDash.shell, "flex min-h-svh w-full")}
        dir={ADMIN_WORKSPACE_DIR}
        lang={language}
      >
        <AdminDashboardSidebar />
        <SidebarInset
          dir={ADMIN_WORKSPACE_DIR}
          lang={language}
          className="relative flex min-h-svh flex-col bg-transparent"
        >
          <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-2 border-b border-border/30 bg-background/60 px-4 backdrop-blur-xl">
            <SidebarTrigger className="-ms-1" />
            <Separator orientation="vertical" className="me-2 h-4" />
            <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
              <AdminShellBreadcrumbs items={crumbTrail} />
              <Button variant="ghost" size="icon" className="shrink-0" asChild>
                <Link href="/" aria-label="Home">
                  <Home className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </header>

          <div className="flex flex-1 flex-col">
            <div
              className={cn(
                "border-b border-cyan-500/20 px-4 sm:px-6 lg:px-8",
                compact ? (headerFooter ? "pt-2 pb-2 sm:pt-2.5 sm:pb-2.5" : "py-2 sm:py-3") : "py-6"
              )}
            >
              <div className={cn(contentMax, "flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between")}>
                <div className="min-w-0">
                  <h1
                    className={compact ? adminDash.pageTitleCompact : adminDash.pageTitle}
                  >
                    {title}
                  </h1>
                  {subtitle ? (
                    <p
                      className={
                        compact ? adminDash.pageSubtitleCompact : adminDash.pageSubtitle
                      }
                    >
                      {subtitle}
                    </p>
                  ) : null}
                </div>
                {headerActions ? (
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    {headerActions}
                  </div>
                ) : null}
              </div>
              {headerFooter ? (
                <div className={cn(contentMax, "mt-1.5")}>{headerFooter}</div>
              ) : null}
              {statusIndicator ? (
                <div className={cn(contentMax, compact ? "mt-1.5" : "mt-4")}>
                  {statusIndicator}
                </div>
              ) : null}
            </div>

            <main
              className={cn(
                contentMax,
                "flex-1 px-4 sm:px-6 lg:px-8",
                compact
                  ? headerFooter
                    ? "space-y-1.5 py-2 sm:py-3"
                    : "space-y-2 py-3 sm:py-4"
                  : "space-y-8 py-6 sm:py-8",
                className
              )}
            >
              {children}
            </main>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
