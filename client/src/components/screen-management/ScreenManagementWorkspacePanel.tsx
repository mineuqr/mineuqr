import { useAuth } from "@/_core/hooks/useAuth";
import { VerificationRequiredPanel } from "@/components/auth/VerificationRequiredPanel";
import { OperationalWorkspaceShell } from "@/components/operational-workspace/OperationalWorkspaceShell";
import { OperationsBar } from "@/components/operational-workspace/OperationsBar";
import { WorkspaceFilters } from "@/components/operational-workspace/WorkspaceFilters";
import { FleetScreenCard } from "@/components/screen-management/FleetScreenCard";
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
import { SCREEN_TYPE_OPTIONS } from "@/lib/operational-screen/screenLabels";
import { navigateToProvisioning } from "@/lib/screen-provisioning/provisioningUrl";
import { useFleetQuery } from "@/lib/screen-fleet/useFleetQuery";
import { restaurantQueriesEnabled } from "@/lib/queryRuntime";
import { isEmailNotVerifiedError } from "@/lib/trpcErrors";
import { LayoutGrid, List, Loader2, Monitor, Plus, RefreshCw, ShieldOff } from "lucide-react";
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
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [stateFilter, setStateFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  const fleetQuery = useFleetQuery({
    restaurantId,
    enabled,
    query: {
      search: search.trim() || undefined,
      role: roleFilter === "all" ? undefined : (roleFilter as (typeof SCREEN_TYPE_OPTIONS)[number]["id"]),
      operationalState:
        stateFilter === "all"
          ? undefined
          : (stateFilter as "operational" | "blocked" | "degraded" | "maintenance" | "disconnected"),
      sortBy: "updated",
      sortOrder: "desc",
      limit: 50,
    },
  });

  const lifecycleScreen = fleetQuery.items.find((s) => s.screenId === lifecycleScreenId);

  const counts = useMemo(() => {
    const kpis = fleetQuery.kpis;
    return {
      total: kpis?.total ?? 0,
      online: kpis?.online ?? 0,
      offline: kpis?.offline ?? 0,
      disabled: kpis?.disabled ?? 0,
    };
  }, [fleetQuery.kpis]);

  if (fleetQuery.error && isEmailNotVerifiedError(fleetQuery.error)) {
    return <VerificationRequiredPanel variant="operations" />;
  }

  const filterPresets = [
    { id: "all", labelEn: "All", labelAr: "الكل" },
    { id: "operational", labelEn: "Operational", labelAr: "تشغيلي" },
    { id: "blocked", labelEn: "Blocked", labelAr: "محجوب" },
    { id: "degraded", labelEn: "Degraded", labelAr: "متدهور" },
    { id: "maintenance", labelEn: "Maintenance", labelAr: "صيانة" },
    { id: "disconnected", labelEn: "Disconnected", labelAr: "غير متصل" },
  ];

  return (
    <OperationalWorkspaceShell
      title={isAr ? "إدارة الشاشات" : "Screen Management"}
      description={
        isAr
          ? "سجّل شاشات التشغيل واضبط إعدادات العرض — كل شاشة مرتبطة بجهاز تشغيلي"
          : "Register operational screens and configure display settings — each screen links to an operational device"
      }
      headerAside={
        <div className="flex gap-2">
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
          <Button
            size="sm"
            onClick={() =>
              navigateToProvisioning({ restaurantId, mode: "create" })
            }
          >
            <Plus className="mr-2 h-4 w-4" />
            {isAr ? "تجهيز شاشة" : "Provision screen"}
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
            <RestaurantKpiCard label={isAr ? "معطل" : "Disabled"} value={counts.disabled} tone="neutral" icon={ShieldOff} />
          </>
        )
      }
      operationsBar={
        <OperationsBar
          items={[
            { id: "total", label: isAr ? "إجمالي الشاشات" : "Total screens", value: counts.total },
            { id: "online", label: isAr ? "متصل الآن" : "Online now", value: counts.online, tone: "success" },
            { id: "offline", label: isAr ? "غير متصل" : "Offline", value: counts.offline, tone: counts.offline > 0 ? "warning" : "default" },
            { id: "disabled", label: isAr ? "معطل" : "Disabled", value: counts.disabled, tone: counts.disabled > 0 ? "danger" : "default" },
          ]}
        />
      }
      filters={
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Input
              placeholder={isAr ? "بحث بالاسم أو الدور أو الإصدار..." : "Search name, role, version..."}
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
            presets={filterPresets}
            activeId={stateFilter}
            onSelect={setStateFilter}
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
      ) : fleetQuery.items.length === 0 ? (
        <p className="py-16 text-center text-muted-foreground">
          {isAr ? "لا توجد شاشات مطابقة." : "No matching screens."}
        </p>
      ) : viewMode === "grid" ? (
        <VirtualizedFleetGrid
          items={fleetQuery.items}
          columns={3}
          estimateRowHeight={220}
          className="w-full"
          getKey={(s) => s.screenId}
          onEndReached={() => {
            if (fleetQuery.hasMore && !fleetQuery.isLoadingMore) void fleetQuery.loadMore();
          }}
          renderItem={(screen) => (
            <FleetScreenCard
              screen={screen}
              language={language}
              onSettings={setSettingsScreenId}
              onLifecycle={setLifecycleScreenId}
            />
          )}
        />
      ) : (
        <div className="rounded-lg border" data-virtualized="fleet-table-wrapper">
          <VirtualizedFleetGrid
            items={fleetQuery.items}
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
                  <p className="text-xs text-muted-foreground">{screen.role}</p>
                </div>
                <span className="text-xs text-muted-foreground">
                  {screen.canonicalState.operationalState}
                </span>
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
        onOpenChange={(open) => !open && setLifecycleScreenId(null)}
        screenId={lifecycleScreenId}
        displayName={lifecycleScreen?.displayName ?? ""}
        restaurantId={restaurantId}
        language={language}
        onDeleted={() => setLifecycleScreenId(null)}
      />
    </OperationalWorkspaceShell>
  );
}
