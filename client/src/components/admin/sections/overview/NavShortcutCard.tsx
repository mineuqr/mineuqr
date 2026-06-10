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
      className={cn(adminDash.card, "flex items-center gap-2.5 p-3")}
    >
      <div className={adminDash.iconContainer}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-medium text-white">{t(item.labelKey)}</div>
        {item.descriptionKey ? (
          <div className="truncate text-xs text-cyan-300/80">{t(item.descriptionKey)}</div>
        ) : null}
      </div>
      <ArrowRight
        className={cn("h-4 w-4 shrink-0 text-cyan-400/70", language === "en" && "rotate-180")}
      />
    </Link>
  );
}
