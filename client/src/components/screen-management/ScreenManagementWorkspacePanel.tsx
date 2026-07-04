import { useAuth } from "@/_core/hooks/useAuth";
import { VerificationRequiredPanel } from "@/components/auth/VerificationRequiredPanel";
import { OperationalWorkspaceShell } from "@/components/operational-workspace/OperationalWorkspaceShell";
import { OperationsBar } from "@/components/operational-workspace/OperationsBar";
import { ScreenSettingsSheet } from "@/components/screen-management/ScreenSettingsSheet";
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
import {
  SCREEN_TYPE_OPTIONS,
  presenceLabel,
  screenTypeLabel,
} from "@/lib/operational-screen/screenLabels";
import { restaurantQueriesEnabled } from "@/lib/queryRuntime";
import { isEmailNotVerifiedError } from "@/lib/trpcErrors";
import type { RouterOutputs } from "@/lib/trpc";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import {
  Loader2,
  Monitor,
  Plus,
  QrCode,
  RefreshCw,
  RotateCw,
  Settings2,
  ShieldOff,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useMemo, useState } from "react";

type ScreenListItem = RouterOutputs["operationalDevice"]["management"]["list"][number];
type CreateScreenResult = RouterOutputs["operationalDevice"]["management"]["create"];
type RotateTokenResult = RouterOutputs["operationalDevice"]["management"]["rotateToken"];

type QrPayload = {
  deviceId: string;
  tokenId: string;
  secret: string;
  qrPayload: Record<string, unknown>;
};

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
  const [settingsScreen, setSettingsScreen] = useState<ScreenListItem | null>(null);
  const [createdQr, setCreatedQr] = useState<QrPayload | null>(null);
  const [screenName, setScreenName] = useState("");
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
      setCreatedQr({
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

  const qrValue = createdQr ? JSON.stringify(createdQr.qrPayload) : "";

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
          <Button variant="outline" size="sm" onClick={() => void listQuery.refetch()} disabled={listQuery.isFetching}>
            {listQuery.isFetching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            {isAr ? "تحديث" : "Refresh"}
          </Button>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            {isAr ? "شاشة جديدة" : "New screen"}
          </Button>
        </div>
      }
      kpis={
        healthQuery.isLoading ? (
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
          {isAr ? "لا توجد شاشات مسجلة بعد." : "No screens registered yet."}
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {(listQuery.data ?? []).map((screen: ScreenListItem) => (
            <article
              key={screen.deviceId}
              className={cn(
                "flex w-full flex-col rounded-2xl border p-5 shadow-sm min-h-[200px]",
                screen.presence === "online" && "border-emerald-500/40 bg-emerald-500/5",
                screen.status === "disabled" && "opacity-70"
              )}
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-lg font-semibold">{screen.displayName}</p>
                  <p className="text-sm text-muted-foreground">{screenTypeLabel(screen.role, language)}</p>
                </div>
                <span
                  className={cn(
                    "shrink-0 rounded-full px-3 py-1 text-xs font-medium",
                    screen.presence === "online" && "bg-emerald-500/15 text-emerald-700",
                    screen.presence === "offline" && "bg-amber-500/15 text-amber-800",
                    screen.presence === "never_seen" && "bg-muted text-muted-foreground"
                  )}
                >
                  {presenceLabel(screen.presence, language)}
                </span>
              </div>

              <dl className="mb-4 flex-1 space-y-2 text-sm">
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">{isAr ? "آخر نبض" : "Last heartbeat"}</dt>
                  <dd>
                    {screen.lastSeenAt
                      ? new Date(screen.lastSeenAt).toLocaleString(isAr ? "ar-SA" : "en-US")
                      : "—"}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">{isAr ? "اللغة" : "Language"}</dt>
                  <dd>{screen.screenConfig?.language === "en" ? "English" : isAr ? "العربية" : "Arabic"}</dd>
                </div>
              </dl>

              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="default"
                  className="min-h-10 flex-1"
                  onClick={() => setSettingsScreen(screen)}
                >
                  <Settings2 className="mr-1 h-4 w-4" />
                  {isAr ? "الإعدادات" : "Settings"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="min-h-10"
                  disabled={screen.status === "disabled" || rotateMutation.isPending}
                  onClick={() => rotateMutation.mutate({ restaurantId, deviceId: screen.deviceId })}
                >
                  <RotateCw className="mr-1 h-4 w-4" />
                  {isAr ? "رمز جديد" : "New code"}
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  className="min-h-10"
                  disabled={screen.status === "disabled" || disableMutation.isPending}
                  onClick={() => disableMutation.mutate({ restaurantId, deviceId: screen.deviceId })}
                >
                  <ShieldOff className="mr-1 h-4 w-4" />
                  {isAr ? "تعطيل" : "Disable"}
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}

      <ScreenSettingsSheet
        open={settingsScreen != null}
        onOpenChange={(open) => !open && setSettingsScreen(null)}
        screen={settingsScreen}
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
                  ? "امسح الرمز على الشاشة لربط الجهاز. لن يُعرض الرمز السري مرة أخرى."
                  : "Scan on the screen to link the device. The secret will not be shown again."}
              </p>
              <p className="w-full break-all rounded-lg bg-muted p-3 font-mono text-xs">{createdQr.secret}</p>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </OperationalWorkspaceShell>
  );
}
