import { useAuth } from "@/_core/hooks/useAuth";
import { VerificationRequiredPanel } from "@/components/auth/VerificationRequiredPanel";
import { OperationalWorkspaceShell } from "@/components/operational-workspace/OperationalWorkspaceShell";
import { OperationsBar } from "@/components/operational-workspace/OperationsBar";
import { WorkspaceFilters } from "@/components/operational-workspace/WorkspaceFilters";
import { FleetScreenCard } from "@/components/screen-management/FleetScreenCard";
import { ScreenSettingsSheet } from "@/components/screen-management/ScreenSettingsSheet";
import { VirtualizedFleetGrid } from "@/components/screen-management/VirtualizedFleetGrid";
import { RestaurantKpiCard, RestaurantKpiGridSkeleton } from "@/components/dashboard/RestaurantKpiCard";
import { RestaurantSectionError } from "@/components/dashboard/RestaurantSectionStates";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SCREEN_TYPE_OPTIONS } from "@/lib/operational-screen/screenLabels";
import { useFleetQuery } from "@/lib/screen-fleet/useFleetQuery";
import { restaurantQueriesEnabled } from "@/lib/queryRuntime";
import { isEmailNotVerifiedError } from "@/lib/trpcErrors";
import type { RouterOutputs } from "@/lib/trpc";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import {
  Check,
  Copy,
  LayoutGrid,
  List,
  Loader2,
  Monitor,
  Plus,
  QrCode,
  RefreshCw,
  ShieldOff,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useMemo, useState } from "react";

function CredentialField({
  label,
  value,
  copyLabel,
  copiedLabel,
  sensitive,
}: {
  label: string;
  value: string;
  copyLabel: string;
  copiedLabel: string;
  sensitive?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const onCopy = () => {
    void navigator.clipboard?.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <div className="w-full space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <button
          type="button"
          onClick={onCopy}
          className="flex items-center gap-1 text-xs text-primary hover:underline"
        >
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          {copied ? copiedLabel : copyLabel}
        </button>
      </div>
      <p
        className={cn(
          "w-full break-all rounded-lg bg-muted p-2 font-mono text-xs",
          sensitive && "text-destructive-foreground/90"
        )}
      >
        {value}
      </p>
    </div>
  );
}

type CreateScreenResult = RouterOutputs["operationalDevice"]["management"]["create"];
type RotateTokenResult = RouterOutputs["operationalDevice"]["management"]["rotateToken"];

type QrPayload = {
  deviceId: string;
  tokenId: string;
  secret: string;
  qrPayload: Record<string, unknown>;
};

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

  const [createOpen, setCreateOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [settingsScreenId, setSettingsScreenId] = useState<string | null>(null);
  const [createdQr, setCreatedQr] = useState<QrPayload | null>(null);
  const [screenName, setScreenName] = useState("");
  const [role, setRole] = useState<string>("kitchen_display");
  const [branchId, setBranchId] = useState("");
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

  const utils = trpc.useUtils();

  const invalidateFleet = () => {
    void utils.operationalDevice.fleet.queryScreens.invalidate();
    void utils.operationalDevice.fleet.getKpis.invalidate({ restaurantId });
  };

  const createMutation = trpc.operationalDevice.management.create.useMutation({
    onSuccess: (result: CreateScreenResult) => {
      setCreatedQr({
        deviceId: result.device.deviceId,
        tokenId: result.token.tokenId,
        secret: result.token.secret,
        qrPayload: result.qrPayload,
      });
      setCreateOpen(false);
      setQrOpen(true);
      setScreenName("");
      setBranchId("");
      invalidateFleet();
    },
  });

  const disableMutation = trpc.operationalDevice.management.disable.useMutation({
    onSuccess: () => invalidateFleet(),
  });

  const rotateMutation = trpc.operationalDevice.management.rotateToken.useMutation({
    onSuccess: (result: RotateTokenResult) => {
      setCreatedQr({
        deviceId: result.qrPayload.deviceId as string,
        tokenId: result.token.tokenId,
        secret: result.token.secret,
        qrPayload: result.qrPayload,
      });
      setQrOpen(true);
      invalidateFleet();
    },
  });

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

  const qrValue = createdQr ? JSON.stringify(createdQr.qrPayload) : "";

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
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            {isAr ? "شاشة جديدة" : "New screen"}
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
              onRotate={(id) => rotateMutation.mutate({ restaurantId, deviceId: id })}
              onDisable={(id) => disableMutation.mutate({ restaurantId, deviceId: id })}
              rotatePending={rotateMutation.isPending}
              disablePending={disableMutation.isPending}
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

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isAr ? "تسجيل شاشة جديدة" : "Register new screen"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="screen-name">{isAr ? "اسم الشاشة" : "Screen name"}</Label>
              <Input id="screen-name" value={screenName} onChange={(e) => setScreenName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{isAr ? "نوع الشاشة" : "Screen type"}</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SCREEN_TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {isAr ? option.ar : option.en}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="branch-id">{isAr ? "معرف الفرع (اختياري)" : "Branch ID (optional)"}</Label>
              <Input id="branch-id" value={branchId} onChange={(e) => setBranchId(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() =>
                createMutation.mutate({
                  restaurantId,
                  displayName: screenName.trim(),
                  role: role as (typeof SCREEN_TYPE_OPTIONS)[number]["id"],
                  branchId: branchId.trim() ? Number(branchId) : null,
                })
              }
              disabled={!screenName.trim() || createMutation.isPending}
            >
              {createMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isAr ? "إنشاء" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              {isAr ? "رمز QR للشاشة" : "Screen QR code"}
            </DialogTitle>
          </DialogHeader>
          {createdQr ? (
            <div className="flex flex-col items-center gap-4">
              <div className="rounded-xl border bg-white p-4">
                <QRCodeSVG value={qrValue} size={220} level="M" />
              </div>
              <p className="text-center text-sm text-muted-foreground">
                {isAr
                  ? "امسح الرمز على الشاشة لربط الجهاز. لن تُعرض بيانات الاعتماد مرة أخرى."
                  : "Scan on the screen to link the device. These credentials will not be shown again."}
              </p>
              <div className="w-full space-y-2">
                <CredentialField
                  label={isAr ? "معرّف الجهاز" : "Device ID"}
                  value={createdQr.deviceId}
                  copyLabel={isAr ? "نسخ" : "Copy"}
                  copiedLabel={isAr ? "تم النسخ" : "Copied"}
                />
                <CredentialField
                  label={isAr ? "معرّف الرمز" : "Token ID"}
                  value={createdQr.tokenId}
                  copyLabel={isAr ? "نسخ" : "Copy"}
                  copiedLabel={isAr ? "تم النسخ" : "Copied"}
                />
                <CredentialField
                  label={isAr ? "الرمز السري" : "Secret"}
                  value={createdQr.secret}
                  copyLabel={isAr ? "نسخ" : "Copy"}
                  copiedLabel={isAr ? "تم النسخ" : "Copied"}
                  sensitive
                />
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </OperationalWorkspaceShell>
  );
}
