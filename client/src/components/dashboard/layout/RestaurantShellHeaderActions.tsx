import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { Bell, Globe } from "lucide-react";
import { useLocation } from "wouter";
import { restaurantDash } from "../restaurantDashStyles";

function NotificationBadge() {
  const { isAuthenticated, authPending } = useAuth();
  const badgeEnabled = !authPending && isAuthenticated;
  const { data: unreadNotifications } = trpc.notification.getUnread.useQuery(undefined, {
    enabled: badgeEnabled,
  });
  const unreadCount = unreadNotifications?.length ?? 0;
  if (unreadCount === 0) return null;
  return (
    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
      {unreadCount > 9 ? "9+" : unreadCount}
    </span>
  );
}

export function RestaurantShellHeaderActions({
  user,
}: {
  user: { name?: string | null } | null | undefined;
}) {
  const { t, language } = useLanguage();
  const [, setLocation] = useLocation();
  const displayName = user?.name || t("dashboard.user");
  const initials = displayName.trim().slice(0, 2).toUpperCase();

  return (
    <div className="flex shrink-0 items-center gap-2 sm:gap-3">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={cn("hidden sm:inline-flex", restaurantDash.toolbarBtn)}
        onClick={() => setLocation("/")}
      >
        <Globe className="h-4 w-4 me-1.5" />
        {language === "ar" ? "العودة للموقع" : "Back to Website"}
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setLocation("/notifications")}
        className={cn("relative", restaurantDash.topBarIconBtn)}
      >
        <Bell className="h-4 w-4" />
        <NotificationBadge />
      </Button>
      <button
        type="button"
        onClick={() => setLocation("/profile")}
        className={restaurantDash.topBarProfileBtn}
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cyan-500/15 text-xs font-semibold text-cyan-400">
          {initials}
        </div>
        <div className="hidden min-w-0 text-start sm:block">
          <p className="truncate text-sm font-medium text-white">{displayName}</p>
          <p className="text-xs text-slate-500">{language === "ar" ? "مالك" : "Owner"}</p>
        </div>
      </button>
    </div>
  );
}
