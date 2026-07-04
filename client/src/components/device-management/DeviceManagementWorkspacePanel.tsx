import { useAuth } from "@/_core/hooks/useAuth";
import { VerificationRequiredPanel } from "@/components/auth/VerificationRequiredPanel";
import { OperationalWorkspaceShell } from "@/components/operational-workspace/OperationalWorkspaceShell";
import { OperationsBar } from "@/components/operational-workspace/OperationsBar";
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
import { DEVICE_ROLE_OPTIONS, deviceRoleLabel, presenceLabel } from "@/lib/operational-device/deviceLabels";
import { restaurantQueriesEnabled } from "@/lib/queryRuntime";
import { isEmailNotVerifiedError } from "@/lib/trpcErrors";
import type { RouterOutputs } from "@/lib/trpc";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { Loader2, MonitorSmartphone, Plus, QrCode, RefreshCw, RotateCw, ShieldOff } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useMemo, useState } from "react";

type CreatedDevicePayload = {
  deviceId: string;
  tokenId: string;
  secret: string;
  qrPayload: Record<string, unknown>;
};

type DeviceListItem = RouterOutputs["operationalDevice"]["management"]["list"][number];
type CreateDeviceResult = RouterOutputs["operationalDevice"]["management"]["create"];
type RotateTokenResult = RouterOutputs["operationalDevice"]["management"]["rotateToken"];

export function DeviceManagementWorkspacePanel({
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
  const [createdDevice, setCreatedDevice] = useState<CreatedDevicePayload | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<string>("kitchen_display");
  const [branchId, setBranchId] = useState("");

  const listQuery = trpc.operationalDevice.management.list.useQuery(
    { restaurantId },
    { enabled, refetchInterval: enabled ? 30_000 : false }
  );

  const healthQuery = trpc.operationalDevice.management.getHealthSummary.useQuery(
    { restaurantId },
    { enabled, refetchInterval: enabled ? 30_000 : false }
  );

  const utils = trpc.useUtils();

  const createMutation = trpc.operationalDevice.management.create.useMutation({
    onSuccess: (result: CreateDeviceResult) => {
      setCreatedDevice({
        deviceId: result.device.deviceId,
        tokenId: result.token.tokenId,
        secret: result.token.secret,
        qrPayload: result.qrPayload,
      });
      setCreateOpen(false);
      setQrOpen(true);
      setDisplayName("");
      setBranchId("");
      void utils.operationalDevice.management.list.invalidate({ restaurantId });
      void utils.operationalDevice.management.getHealthSummary.invalidate({ restaurantId });
    },
  });

  const disableMutation = trpc.operationalDevice.management.disable.useMutation({
    onSuccess: () => {
      void utils.operationalDevice.management.list.invalidate({ restaurantId });
      void utils.operationalDevice.management.getHealthSummary.invalidate({ restaurantId });
    },
  });

  const rotateMutation = trpc.operationalDevice.management.rotateToken.useMutation({
    onSuccess: (result: RotateTokenResult) => {
      setCreatedDevice({
        deviceId: result.qrPayload.deviceId as string,
        tokenId: result.token.tokenId,
        secret: result.token.secret,
        qrPayload: result.qrPayload,
      });
      setQrOpen(true);
      void utils.operationalDevice.management.list.invalidate({ restaurantId });
    },
  });

  const counts = useMemo(() => {
    const summary = healthQuery.data;
    return {
      total: summary?.total ?? 0,
      online: summary?.online ?? 0,
      offline: summary?.offline ?? 0,
      disabled: summary?.disabled ?? 0,
    };
  }, [healthQuery.data]);

  if (listQuery.error && isEmailNotVerifiedError(listQuery.error)) {
    return <VerificationRequiredPanel variant="operations" />;
  }

  const qrValue = createdDevice ? JSON.stringify(createdDevice.qrPayload) : "";

  return (
    <OperationalWorkspaceShell
      title={isAr ? "إدارة الأجهزة" : "Device Management"}
      description={
        isAr
          ? "تسجيل وإدارة أجهزة التشغيل — الهوية والمصادقة منفصلة عن مستخدمي لوحة التحكم"
          : "Register and manage operational devices — identity and auth separate from dashboard users"
      }
      headerAside={
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => void listQuery.refetch()} disabled={listQuery.isFetching}>
            {listQuery.isFetching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            {isAr ? "تحديث" : "Refresh"}
          </Button>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            {isAr ? "جهاز جديد" : "New device"}
          </Button>
        </div>
      }
      kpis={
        healthQuery.isLoading ? (
          <RestaurantKpiGridSkeleton count={4} />
        ) : (
          <>
            <RestaurantKpiCard label={isAr ? "الأجهزة" : "Devices"} value={counts.total} icon={MonitorSmartphone} />
            <RestaurantKpiCard label={isAr ? "متصل" : "Online"} value={counts.online} tone="success" icon={MonitorSmartphone} />
            <RestaurantKpiCard label={isAr ? "غير متصل" : "Offline"} value={counts.offline} tone="warning" icon={MonitorSmartphone} />
            <RestaurantKpiCard label={isAr ? "معطل" : "Disabled"} value={counts.disabled} tone="neutral" icon={ShieldOff} />
          </>
        )
      }
      operationsBar={
        <OperationsBar
          items={[
            { id: "total", label: isAr ? "إجمالي الأجهزة" : "Total devices", value: counts.total },
            { id: "online", label: isAr ? "متصل الآن" : "Online now", value: counts.online, tone: "success" },
            { id: "offline", label: isAr ? "غير متصل" : "Offline", value: counts.offline, tone: counts.offline > 0 ? "warning" : "default" },
            { id: "disabled", label: isAr ? "معطل" : "Disabled", value: counts.disabled, tone: counts.disabled > 0 ? "danger" : "default" },
          ]}
        />
      }
    >
      {listQuery.error ? (
        <RestaurantSectionError
          message={listQuery.error.message}
          retryLabel={isAr ? "إعادة المحاولة" : "Retry"}
          onRetry={() => void listQuery.refetch()}
        />
      ) : listQuery.isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (listQuery.data ?? []).length === 0 ? (
        <p className="py-16 text-center text-muted-foreground">
          {isAr ? "لا توجد أجهزة مسجلة بعد." : "No operational devices registered yet."}
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {(listQuery.data ?? []).map((device: DeviceListItem) => (
            <article
              key={device.deviceId}
              className={cn(
                "rounded-2xl border p-5 shadow-sm min-h-[160px]",
                device.presence === "online" && "border-emerald-500/40 bg-emerald-500/5",
                device.status === "disabled" && "opacity-70"
              )}
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold">{device.displayName}</p>
                  <p className="text-sm text-muted-foreground">{deviceRoleLabel(device.role, language)}</p>
                  <p className="font-mono text-xs text-muted-foreground">{device.deviceId}</p>
                </div>
                <span
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-medium",
                    device.presence === "online" && "bg-emerald-500/15 text-emerald-700",
                    device.presence === "offline" && "bg-amber-500/15 text-amber-800",
                    device.presence === "never_seen" && "bg-muted text-muted-foreground"
                  )}
                >
                  {presenceLabel(device.presence, language)}
                </span>
              </div>
              <dl className="mb-4 space-y-1 text-sm">
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">{isAr ? "الإصدار" : "Version"}</dt>
                  <dd>{device.reportedVersion ?? "—"}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">{isAr ? "آخر ظهور" : "Last seen"}</dt>
                  <dd>{device.lastSeenAt ? new Date(device.lastSeenAt).toLocaleString(language === "ar" ? "ar-SA" : "en-US") : "—"}</dd>
                </div>
                {device.branchId != null ? (
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">{isAr ? "الفرع" : "Branch"}</dt>
                    <dd>{device.branchId}</dd>
                  </div>
                ) : null}
              </dl>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="min-h-10"
                  disabled={device.status === "disabled" || rotateMutation.isPending}
                  onClick={() => rotateMutation.mutate({ restaurantId, deviceId: device.deviceId })}
                >
                  <RotateCw className="mr-1 h-4 w-4" />
                  {isAr ? "تدوير الرمز" : "Rotate token"}
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  className="min-h-10"
                  disabled={device.status === "disabled" || disableMutation.isPending}
                  onClick={() => disableMutation.mutate({ restaurantId, deviceId: device.deviceId })}
                >
                  <ShieldOff className="mr-1 h-4 w-4" />
                  {isAr ? "تعطيل" : "Disable"}
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isAr ? "تسجيل جهاز تشغيلي" : "Register operational device"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="device-name">{isAr ? "الاسم" : "Display name"}</Label>
              <Input id="device-name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{isAr ? "الدور" : "Role"}</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DEVICE_ROLE_OPTIONS.map((option) => (
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
                  displayName: displayName.trim(),
                  role: role as (typeof DEVICE_ROLE_OPTIONS)[number]["id"],
                  branchId: branchId.trim() ? Number(branchId) : null,
                })
              }
              disabled={!displayName.trim() || createMutation.isPending}
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
              {isAr ? "رمز QR للجهاز" : "Device QR Code"}
            </DialogTitle>
          </DialogHeader>
          {createdDevice ? (
            <div className="flex flex-col items-center gap-4">
              <div className="rounded-xl border bg-white p-4">
                <QRCodeSVG value={qrValue} size={220} level="M" />
              </div>
              <p className="text-center text-sm text-muted-foreground">
                {isAr
                  ? "امسح الرمز على الجهاز لتخزين بيانات الاعتماد. لن يُعرض الرمز السري مرة أخرى."
                  : "Scan on the device to store credentials. The secret will not be shown again."}
              </p>
              <p className="w-full break-all rounded-lg bg-muted p-3 font-mono text-xs">{createdDevice.secret}</p>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </OperationalWorkspaceShell>
  );
}
