import { useAuth } from "@/_core/hooks/useAuth";
import { VerificationRequiredPanel } from "@/components/auth/VerificationRequiredPanel";
import { OperationalWorkspaceShell } from "@/components/operational-workspace/OperationalWorkspaceShell";
import { WorkspaceFilters } from "@/components/operational-workspace/WorkspaceFilters";
import {
  FleetScreenCard,
  type FleetScreenManageAction,
} from "@/components/screen-management/FleetScreenCard";
import {
  FleetScreenTableHeader,
  FleetScreenTableRow,
} from "@/components/screen-management/FleetScreenTableRow";
import { ScreenDetailsSheet } from "@/components/screen-management/ScreenDetailsSheet";
import {
  resolveAccessFocusFromManageAction,
  resolveDetailsTabFromManageAction,
  type ScreenDetailsTab,
} from "@/lib/screen-management/screenDetailsPresentation";
import { VirtualizedFleetGrid } from "@/components/screen-management/VirtualizedFleetGrid";
import { VirtualizedFleetTable } from "@/components/screen-management/VirtualizedFleetTable";
import { SemanticKpiCard, SemanticKpiSkeleton } from "@/design-system/semantic-card";
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
import { SCREEN_TYPE_OPTIONS } from "@/lib/operational-screen/screenLabels";
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

function FleetEmptyState({
  isAr,
  restaurantId,
}: {
  isAr: boolean;
  restaurantId: number;
}) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-14 text-center"
      data-fleet-state="empty"
    >
      <Monitor className="h-10 w-10 text-muted-foreground" />
      <div className="max-w-md space-y-1.5">
        <p className="text-base font-medium">{isAr ? "لا توجد شاشات بعد" : "No screens yet"}</p>
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
  );
}

function FleetFilterEmptyState({
  isAr,
  onClear,
}: {
  isAr: boolean;
  onClear: () => void;
}) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-14 text-center"
      data-fleet-state="filter-empty"
    >
      <p className="text-sm text-muted-foreground">
        {isAr ? "لا توجد شاشات مطابقة للفلاتر." : "No screens match these filters."}
      </p>
      <Button variant="outline" size="sm" onClick={onClear}>
        {isAr ? "مسح الفلاتر" : "Clear filters"}
      </Button>
    </div>
  );
}

function FleetLoadingState() {
  return (
    <div className="flex justify-center py-14" data-fleet-state="loading">
      <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" aria-label="Loading" />
    </div>
  );
}

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

  const [detailsScreenId, setDetailsScreenId] = useState<string | null>(null);
  const [detailsTab, setDetailsTab] = useState<ScreenDetailsTab>("display");
  const [accessFocus, setAccessFocus] = useState<FleetScreenManageAction | null>(null);
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

  const detailsScreen = fleetQuery.items.find((s) => s.screenId === detailsScreenId);

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

  const openDetails = (
    screenId: string,
    tab: ScreenDetailsTab,
    focus: FleetScreenManageAction | null = null
  ) => {
    setDetailsScreenId(screenId);
    setDetailsTab(tab);
    setAccessFocus(focus);
  };

  const openManage = (screenId: string, action: FleetScreenManageAction) => {
    openDetails(
      screenId,
      resolveDetailsTabFromManageAction(action),
      resolveAccessFocusFromManageAction(action)
    );
  };

  const clearFilters = () => {
    setStateFilter("all");
    setRoleFilter("all");
    setSearch("");
  };

  const categorySummaryFor = (screenId: string, role: (typeof filteredItems)[number]["role"]) =>
    formatCategorySummary(
      role,
      visibleCategoryIdsByScreenId.get(screenId),
      categoryNameById,
      isAr
    );

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
          <SemanticKpiSkeleton count={4} />
        ) : (
          <>
            <SemanticKpiCard label={isAr ? "الشاشات" : "Screens"} value={counts.total} domain="analytics" tone="info" icon={Monitor} />
            <SemanticKpiCard label={isAr ? "متصل" : "Online"} value={counts.online} tone="success" domain="success" icon={Monitor} />
            <SemanticKpiCard label={isAr ? "غير متصل" : "Offline"} value={counts.offline} tone="warning" domain="warning" icon={Monitor} />
            <SemanticKpiCard
              label={isAr ? "يحتاج انتباه" : "Needs attention"}
              value={counts.needsAttention}
              tone={counts.needsAttention > 0 ? "warning" : "neutral"}
              domain={counts.needsAttention > 0 ? "warning" : "analytics"}
              icon={Monitor}
            />
          </>
        )
      }
      filters={
        <div className="flex flex-col gap-2.5">
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
            <div className="flex gap-1" role="group" aria-label={isAr ? "عرض الأسطول" : "Fleet view"}>
              <Button
                variant={viewMode === "grid" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("grid")}
                aria-pressed={viewMode === "grid"}
                aria-label={isAr ? "عرض البطاقات" : "Card view"}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "table" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("table")}
                aria-pressed={viewMode === "table"}
                aria-label={isAr ? "عرض الجدول" : "Table view"}
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
        <FleetLoadingState />
      ) : isEmptyFleet ? (
        <FleetEmptyState isAr={isAr} restaurantId={restaurantId} />
      ) : filteredItems.length === 0 ? (
        <FleetFilterEmptyState isAr={isAr} onClear={clearFilters} />
      ) : viewMode === "grid" ? (
        <VirtualizedFleetGrid
          items={filteredItems}
          columns={3}
          estimateRowHeight={200}
          gap={12}
          className="w-full"
          getKey={(s) => s.screenId}
          onEndReached={() => {
            if (fleetQuery.hasMore && !fleetQuery.isLoadingMore) void fleetQuery.loadMore();
          }}
          renderItem={(screen) => (
            <FleetScreenCard
              screen={screen}
              language={language}
              categorySummary={categorySummaryFor(screen.screenId, screen.role)}
              onSettings={(id) => openDetails(id, "display")}
              onManage={openManage}
            />
          )}
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border" data-virtualized="fleet-table-wrapper">
          <VirtualizedFleetTable
            items={filteredItems}
            rowHeight={60}
            className="min-w-[880px] w-full"
            getKey={(s) => s.screenId}
            header={<FleetScreenTableHeader language={language} />}
            onEndReached={() => {
              if (fleetQuery.hasMore && !fleetQuery.isLoadingMore) void fleetQuery.loadMore();
            }}
            renderRow={(screen) => (
              <FleetScreenTableRow
                screen={screen}
                language={language}
                categorySummary={categorySummaryFor(screen.screenId, screen.role)}
                onSettings={(id) => openDetails(id, "display")}
                onManage={openManage}
              />
            )}
          />
        </div>
      )}

      {fleetQuery.isLoadingMore ? (
        <div className="flex justify-center py-3" data-fleet-state="loading-more">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : null}

      <ScreenDetailsSheet
        open={detailsScreenId != null}
        onOpenChange={(open) => {
          if (!open) {
            setDetailsScreenId(null);
            setAccessFocus(null);
          }
        }}
        screenId={detailsScreenId}
        screen={detailsScreen ?? null}
        restaurantId={restaurantId}
        language={language}
        initialTab={detailsTab}
        accessFocus={accessFocus}
        categorySummary={
          detailsScreen
            ? categorySummaryFor(detailsScreen.screenId, detailsScreen.role)
            : null
        }
        onDeleted={() => {
          setDetailsScreenId(null);
          setAccessFocus(null);
        }}
      />
    </OperationalWorkspaceShell>
  );
}
