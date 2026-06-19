import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { Bell, ChevronDown, Globe, LogOut, Store, User } from "lucide-react";
import { useLocation } from "wouter";
import { restaurantDash } from "../restaurantDashStyles";

function ProfileNotificationBadge({ className }: { className?: string }) {
  const { isAuthenticated, authPending } = useAuth();
  const badgeEnabled = !authPending && isAuthenticated;
  const { data: unreadNotifications } = trpc.notification.getUnread.useQuery(undefined, {
    enabled: badgeEnabled,
  });
  const unreadCount = unreadNotifications?.length ?? 0;
  if (unreadCount === 0) return null;
  return (
    <span
      className={cn(
        "absolute flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-0.5 text-[10px] font-bold text-white",
        className
      )}
    >
      {unreadCount > 9 ? "9+" : unreadCount}
    </span>
  );
}

export function RestaurantShellHeaderActions({
  user,
  onRestaurants,
  onLogout,
}: {
  user: { name?: string | null } | null | undefined;
  onRestaurants: () => void;
  onLogout: () => void;
}) {
  const { t, language } = useLanguage();
  const [, setLocation] = useLocation();
  const displayName = user?.name || t("dashboard.user");
  const initials = displayName.trim().slice(0, 2).toUpperCase();
  const isAr = language === "ar";

  const accountLabel = isAr ? "حسابي" : t("profile.title");
  const notificationsLabel = t("common.notifications");
  const myRestaurantsLabel = isAr ? "مطاعمي" : "My Restaurants";
  const signOutLabel = isAr ? "تسجيل الخروج" : t("dashboard.signOut");

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
        {isAr ? "العودة للموقع" : "Back to Website"}
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={cn(restaurantDash.topBarProfileBtn, "min-h-9 touch-manipulation")}
            aria-label={accountLabel}
          >
            <span className="relative shrink-0">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-500/15 text-xs font-semibold text-cyan-400">
                {initials}
              </span>
              <ProfileNotificationBadge className="-top-1 -right-1" />
            </span>
            <div className="hidden min-w-0 text-start sm:block">
              <p className="truncate text-sm font-medium text-white">{displayName}</p>
              <p className="text-xs text-slate-500">{isAr ? "مالك" : "Owner"}</p>
            </div>
            <ChevronDown className="hidden h-4 w-4 shrink-0 text-slate-400 sm:block" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          sideOffset={8}
          className="min-w-[11rem] border-cyan-500/20 bg-slate-900/95 backdrop-blur-xl"
        >
          <DropdownMenuItem onClick={() => setLocation("/profile")}>
            <User />
            {accountLabel}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setLocation("/notifications")}>
            <Bell />
            {notificationsLabel}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onRestaurants}>
            <Store />
            {myRestaurantsLabel}
          </DropdownMenuItem>
          <DropdownMenuSeparator className="bg-cyan-500/15" />
          <DropdownMenuItem variant="destructive" onClick={onLogout}>
            <LogOut />
            {signOutLabel}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
