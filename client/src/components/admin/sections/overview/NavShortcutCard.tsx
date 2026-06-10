import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { adminDash } from "@/components/admin/layout/adminDashStyles";
import { cn } from "@/lib/utils";
import type { AdminNavItem } from "@/lib/admin/routes/adminRouteTypes";

export type NavShortcutCardItem = Pick<
  AdminNavItem,
  "path" | "labelKey" | "descriptionKey" | "icon"
>;

type NavShortcutCardProps = {
  item: NavShortcutCardItem;
};

export function NavShortcutCard({ item }: NavShortcutCardProps) {
  const { t, language } = useLanguage();
  const Icon = item.icon;

  return (
    <Link
      href={item.path}
      className={cn(
        adminDash.card,
        "flex items-center gap-3 p-4 transition hover:border-primary/40 hover:bg-primary/5"
      )}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-medium text-foreground">{t(item.labelKey)}</div>
        {item.descriptionKey ? (
          <div className="truncate text-xs text-muted-foreground">
            {t(item.descriptionKey)}
          </div>
        ) : null}
      </div>
      <ArrowRight
        className={cn("h-4 w-4 shrink-0 text-muted-foreground", language === "en" && "rotate-180")}
      />
    </Link>
  );
}
