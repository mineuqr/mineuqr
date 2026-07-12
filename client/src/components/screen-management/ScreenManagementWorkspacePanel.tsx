import { useAuth } from "@/_core/hooks/useAuth";
import { VerificationRequiredPanel } from "@/components/auth/VerificationRequiredPanel";
import { OperationalWorkspaceShell } from "@/components/operational-workspace/OperationalWorkspaceShell";
import { OperationsBar } from "@/components/operational-workspace/OperationsBar";
import { WorkspaceFilters } from "@/components/operational-workspace/WorkspaceFilters";
import {
  FleetScreenCard,
  type FleetScreenManageAction,
} from "@/components/screen-management/FleetScreenCard";
import { ScreenCredentialLifecycleSheet } from "@/components/screen-management/ScreenCredentialLifecycleSheet";
import { ScreenSettingsSheet } from "@/components/screen-management/ScreenSettingsSheet";
import { VirtualizedFleetGrid } from "@/components/screen-management/VirtualizedFleetGrid";
import { RestaurantKpiCard, RestaurantKpiGridSkeleton } from "@/components/dashboard/RestaurantKpiCard";
import { RestaurantSectionError } from "@/components/dashboard/RestaurantSectionStates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SCREEN_TYPE_OPTIONS, presenceLabel } from "@/lib/operational-screen/screenLabels";
import {
  countNeedsAttention,
  formatCategorySummary,
  matchesOperatorFleetFilter,
  OPERATOR_FLEET_FILTER_PRESETS,
  type OperatorFleetFilter,
} from "@/lib/screen-management/operatorFleetPresentation";
import { useFleetScreenConfigs } from "@/lib/screen-management/useFleetScreenConfigs";
import { navigateToProvisioning } from "@/lib/screen-provisioning/provisioningUrl";
import { useFleetQuery } from "@/lib/screen-fleet/useFleetQuery";
import { restaurantQueriesEnabled } from "@/lib/queryRuntime";
import { isEmailNotVerifiedError } from "@/lib/trpcErrors";
import { trpc } from "@/lib/trpc";
import { LayoutGrid, List, Loader2, Monitor, Plus, RefreshCw } from "lucide-react";
import { useMemo, useState } from "react";

type ViewMode = "grid" | "table";

export function ScreenManagementWorkspacePanel({
  restaurantId,
  language,
}: {
  restaurantId: number;
  language: string;
}) {
  const isAr = language === "ar";
  const { isAuthenticated, authPending } = useAuth();
  const enabled = restaurantQueriesEnabled(authPending, isAuthenticated, restaurantId);

  const [settingsScreenId, setSettingsScreenId] = useState<string | null>(null);
  const [lifecycleScreenId, setLifecycleScreenId] = useState<string | null>(null);
  const [lifecycleFocus, setLifecycleFocus] = useState<FleetScreenManageAction | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [stateFilter, setStateFilter] = useState<OperatorFleetFilter>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  const fleetQuery = useFleetQuery({
    restaurantId,
    enabled,
    query: {
      search: search.trim() || undefined,
      role: roleFilter === "all" ? undefined : (roleFilter as (typeof SCREEN_TYPE_OPTIONS)[number]["id"]),
      sortBy: "updated",
      sortOrder: "desc",
      limit: 50,
    },
  });

  const { visibleCategoryIdsByScreenId } = useFleetScreenConfigs(restaurantId, enabled);
  const categoriesQuery = trpc.category.list.useQuery(
    { restaurantId },
    { enabled: enabled && restaurantId > 0 }
  );

  const categoryNameById = useMemo(() => {
    const map = new Map<number, string>();
    for (const category of categoriesQuery.data ?? []) {
      map.set(category.id, isAr ? category.nameAr : category.nameEn || category.nameAr);
    }
    return map;
  }, [categoriesQuery.data, isAr]);

  const filteredItems = useMemo(
    () => fleetQuery.items.filter((screen) => matchesOperatorFleetFilter(screen, stateFilter)),
    [fleetQuery.items, stateFilter]
  );

  const lifecycleScreen = fleetQuery.items.find((s) => s.screenId === lifecycleScreenId);

  const counts = useMemo(() => {
    const kpis = fleetQuery.kpis;
    const needsAttention =
      fleetQuery.items.length > 0
        ? countNeedsAttention(fleetQuery.items)
        : (kpis?.degraded ?? 0) + (kpis?.disabled ?? 0);
    return {
      total: kpis?.total ?? 0,
      online: kpis?.online ?? 0,
      offline: kpis?.offline ?? 0,
      needsAttention,
    };
  }, [fleetQuery.items, fleetQuery.kpis]);

  const isEmptyFleet =
    counts.total === 0 &&
    stateFilter === "all" &&
    roleFilter === "all" &&
    search.trim() === "";

  const openManage = (screenId: string, action: FleetScreenManageAction) => {
    setLifecycleFocus(action);
    setLifecycleScreenId(screenId);
  };

  if (fleetQuery.error && isEmailNotVerifiedError(fleetQuery.error)) {
    return <VerificationRequiredPanel variant="operations" />;
  }

  return (
    <OperationalWorkspaceShell
      title={isAr ? "الشاشات" : "Screens"}
      description={
        isAr
          ? "أدر شاشات مطبخك واستلام الطلبات — أضف شاشة وافتحها على الجهاز"
          : "Manage your kitchen and service screens — add a screen and open it on the device"
      }
      headerAside={
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={() => navigateToProvisioning({ restaurantId, mode: "create" })}
          >
            <Plus className="mr-2 h-4 w-4" />
            {isAr ? "إنشاء شاشة" : "Create screen"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void fleetQuery.refetch()}
            disabled={fleetQuery.isFetching}
          >
            {fleetQuery.isFetching ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            {isAr ? "تحديث" : "Refresh"}
          </Button>
        </div>
      }
      kpis={
        fleetQuery.isLoading ? (
          <RestaurantKpiGridSkeleton count={4} />
        ) : (
          <>
            <RestaurantKpiCard label={isAr ? "الشاشات" : "Screens"} value={counts.total} icon={Monitor} />
            <RestaurantKpiCard label={isAr ? "متصل" : "Online"} value={counts.online} tone="success" icon={Monitor} />
            <RestaurantKpiCard label={isAr ? "غير متصل" : "Offline"} value={counts.offline} tone="warning" icon={Monitor} />
            <RestaurantKpiCard
              label={isAr ? "يحتاج انتباه" : "Needs attention"}
              value={counts.needsAttention}
              tone={counts.needsAttention > 0 ? "warning" : "neutral"}
              icon={Monitor}
            />
          </>
        )
      }
      operationsBar={
        <OperationsBar
          items={[
            { id: "total", label: isAr ? "إجمالي الشاشات" : "Total screens", value: counts.total },
            { id: "online", label: isAr ? "متصل الآن" : "Online now", value: counts.online, tone: "success" },
            { id: "offline", label: isAr ? "غير متصل" : "Offline", value: counts.offline, tone: counts.offline > 0 ? "warning" : "default" },
            {
              id: "needs_attention",
              label: isAr ? "يحتاج انتباه" : "Needs attention",
              value: counts.needsAttention,
              tone: counts.needsAttention > 0 ? "warning" : "default",
            },
          ]}
        />
      }
      filters={
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Input
              placeholder={isAr ? "بحث بالاسم أو الدور..." : "Search name or role..."}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-xs"
            />
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={isAr ? "الدور" : "Role"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isAr ? "كل الأدوار" : "All roles"}</SelectItem>
                {SCREEN_TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {isAr ? option.ar : option.en}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-1">
              <Button
                variant={viewMode === "grid" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("grid")}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "table" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("table")}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <WorkspaceFilters
            presets={OPERATOR_FLEET_FILTER_PRESETS}
            activeId={stateFilter}
            onSelect={(id) => setStateFilter(id as OperatorFleetFilter)}
            language={language}
          />
        </div>
      }
    >
      {fleetQuery.error ? (
        <RestaurantSectionError
          message={fleetQuery.error.message}
          retryLabel={isAr ? "إعادة المحاولة" : "Retry"}
          onRetry={() => void fleetQuery.refetch()}
        />
      ) : fleetQuery.isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : isEmptyFleet ? (
        <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
          <Monitor className="h-12 w-12 text-muted-foreground" />
          <div className="max-w-md space-y-2">
            <p className="text-lg font-medium">{isAr ? "لا توجد شاشات بعد" : "No screens yet"}</p>
            <p className="text-sm text-muted-foreground">
              {isAr
                ? "أنشئ شاشة لربط شاشة مطبخ أو استلام على جهازك."
                : "Create a screen to connect a kitchen or service display on your device."}
            </p>
          </div>
          <Button onClick={() => navigateToProvisioning({ restaurantId, mode: "create" })}>
            <Plus className="mr-2 h-4 w-4" />
            {isAr ? "إنشاء شاشة" : "Create screen"}
          </Button>
        </div>
      ) : filteredItems.length === 0 ? (
        <p className="py-16 text-center text-muted-foreground">
          {isAr ? "لا توجد شاشات مطابقة للفلاتر." : "No screens match these filters."}
        </p>
      ) : viewMode === "grid" ? (
        <VirtualizedFleetGrid
          items={filteredItems}
          columns={3}
          estimateRowHeight={240}
          className="w-full"
          getKey={(s) => s.screenId}
          onEndReached={() => {
            if (fleetQuery.hasMore && !fleetQuery.isLoadingMore) void fleetQuery.loadMore();
          }}
          renderItem={(screen) => (
            <FleetScreenCard
              screen={screen}
              language={language}
              categorySummary={formatCategorySummary(
                screen.role,
                visibleCategoryIdsByScreenId.get(screen.screenId),
                categoryNameById,
                isAr
              )}
              onSettings={setSettingsScreenId}
              onManage={openManage}
            />
          )}
        />
      ) : (
        <div className="rounded-lg border" data-virtualized="fleet-table-wrapper">
          <VirtualizedFleetGrid
            items={filteredItems}
            columns={1}
            estimateRowHeight={72}
            className="w-full"
            getKey={(s) => s.screenId}
            onEndReached={() => {
              if (fleetQuery.hasMore && !fleetQuery.isLoadingMore) void fleetQuery.loadMore();
            }}
            renderItem={(screen) => (
              <div className="flex items-center justify-between border-b px-4 py-3 text-sm">
                <div>
                  <p className="font-medium">{screen.displayName}</p>
                  <p className="text-xs text-muted-foreground">
                    {presenceLabel(screen.healthSummary.presence, language)}
                  </p>
                </div>
                <Button size="sm" variant="ghost" onClick={() => setSettingsScreenId(screen.screenId)}>
                  {isAr ? "الإعدادات" : "Settings"}
                </Button>
              </div>
            )}
          />
        </div>
      )}

      {fleetQuery.isLoadingMore ? (
        <div className="flex justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : null}

      <ScreenSettingsSheet
        open={settingsScreenId != null}
        onOpenChange={(open) => !open && setSettingsScreenId(null)}
        screenId={settingsScreenId}
        restaurantId={restaurantId}
        language={language}
      />

      <ScreenCredentialLifecycleSheet
        open={lifecycleScreenId != null}
        onOpenChange={(open) => {
          if (!open) {
            setLifecycleScreenId(null);
            setLifecycleFocus(null);
          }
        }}
        screenId={lifecycleScreenId}
        screen={lifecycleScreen ?? null}
        displayName={lifecycleScreen?.displayName ?? ""}
        restaurantId={restaurantId}
        language={language}
        initialFocus={lifecycleFocus}
        onDeleted={() => {
          setLifecycleScreenId(null);
          setLifecycleFocus(null);
        }}
      />
    </OperationalWorkspaceShell>
  );
}
