import type { ReactNode } from "react";
import { Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { adminDash } from "./adminDashStyles";

type AdminPageShellProps = {
  title: string;
  subtitle?: string;
  statsLabel?: string;
  onNavigateHome: () => void;
  onNavigateStats?: () => void;
  headerActions?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function AdminPageShell({
  title,
  subtitle,
  statsLabel = "Statistics",
  onNavigateHome,
  onNavigateStats,
  headerActions,
  children,
  className,
}: AdminPageShellProps) {
  return (
    <div className={cn(adminDash.shell, className)}>
      <div className={adminDash.shellGlow} aria-hidden />

      <nav className={adminDash.nav}>
        <div className={adminDash.navInner}>
          <button
            type="button"
            onClick={onNavigateHome}
            className="brand-mark flex items-center gap-2 rounded-md outline-none transition hover:opacity-80 select-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <Store className="h-6 w-6 text-primary" />
            <span className="font-bold text-foreground">{title}</span>
          </button>
          <div className="flex items-center gap-2">
            {onNavigateStats ? (
              <Button onClick={onNavigateStats} variant="outline" size="sm" className="text-xs">
                {statsLabel}
              </Button>
            ) : null}
          </div>
        </div>
      </nav>

      <main className={adminDash.main}>
        <header className="flex flex-col gap-4 border-b border-border/40 pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className={adminDash.pageTitle}>{title}</h1>
            {subtitle ? <p className={adminDash.pageSubtitle}>{subtitle}</p> : null}
          </div>
          {headerActions ? (
            <div className="flex shrink-0 flex-wrap items-center gap-2">{headerActions}</div>
          ) : null}
        </header>
        {children}
      </main>
    </div>
  );
}
