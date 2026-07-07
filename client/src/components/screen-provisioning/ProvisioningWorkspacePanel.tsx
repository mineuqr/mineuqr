import { useAuth } from "@/_core/hooks/useAuth";
import { VerificationRequiredPanel } from "@/components/auth/VerificationRequiredPanel";
import { OperationalWorkspaceShell } from "@/components/operational-workspace/OperationalWorkspaceShell";
import { OperationsBar } from "@/components/operational-workspace/OperationsBar";
import { ProvisioningActivationPanel } from "@/components/screen-provisioning/ProvisioningActivationPanel";
import { ProvisioningPendingDevicePanel } from "@/components/screen-provisioning/ProvisioningPendingDevicePanel";
import { ProvisioningStatusPanel } from "@/components/screen-provisioning/ProvisioningStatusPanel";
import { DeviceOperationalStatusPanel } from "@/components/screen-provisioning/DeviceOperationalStatusPanel";
import { RestaurantSectionError } from "@/components/dashboard/RestaurantSectionStates";
import { Button } from "@/components/ui/button";
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
import { provisioningSessionManager } from "@/lib/screen-provisioning/ProvisioningSessionManager";
import {
  navigateToFleet,
  navigateToProvisioning,
} from "@/lib/screen-provisioning/provisioningUrl";
import { useProvisioningUrlState } from "@/lib/screen-provisioning/useProvisioningUrlState";
import { requiresRotateConfirmation } from "@/lib/screen-provisioning/provisioningNavigation";
import { useProvisioningWorkspace } from "@/lib/screen-provisioning/useProvisioningWorkspace";
import { restaurantQueriesEnabled } from "@/lib/queryRuntime";
import { isEmailNotVerifiedError } from "@/lib/trpcErrors";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, CheckCircle2, Loader2, RotateCw } from "lucide-react";
import { useEffect, useState } from "react";

function RotateCredentialsConfirmation({
  deviceId,
  language,
  pending,
  onConfirm,
  onCancel,
}: {
  deviceId: string;
  language: string;
  pending: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const isAr = language === "ar";
  return (
    <div className="mt-6 max-w-lg space-y-4 rounded-2xl border border-amber-500/40 bg-amber-500/5 p-6">
      <h3 className="font-semibold">
        {isAr ? "تأكيد تدوير الاعتماد" : "Confirm credential rotation"}
      </h3>
      <p className="text-sm text-muted-foreground">
        {isAr
          ? "سيتم إلغاء بيانات الاعتماد الحالية على هذا الجهاز. يجب إعادة ربط الشاشة باستخدام الرمز الجديد."
          : "Current device credentials will be invalidated. The screen must be re-paired using the new code."}
      </p>
      <p className="font-mono text-xs text-muted-foreground">{deviceId}</p>
      <div className="flex gap-2">
        <Button disabled={pending} onClick={onConfirm}>
          {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {isAr ? "تدوير الاعتماد" : "Rotate credentials"}
        </Button>
        <Button variant="outline" disabled={pending} onClick={onCancel}>
          {isAr ? "إلغاء" : "Cancel"}
        </Button>
      </div>
    </div>
  );
}

/**
 * SCREEN-PROVISIONING-WORKSPACE-1 — first-class provisioning operational workspace.
 * No dialog-based provisioning. Session survives refresh via URL + sessionStorage.
 */
export function ProvisioningWorkspacePanel({
  restaurantId,
  language,
}: {
  restaurantId: number;
  language: string;
}) {
  const isAr = language === "ar";
  const { isAuthenticated, authPending } = useAuth();
  const enabled = restaurantQueriesEnabled(authPending, isAuthenticated, restaurantId);
  const urlState = useProvisioningUrlState();

  const workspace = useProvisioningWorkspace(restaurantId, enabled);
  const {
    session,
    health,
    diagnostics,
    setSessionState,
    retry,
    cancel,
    statusView,
    resumeSessionMissing,
    isStatusLoading,
  } = workspace;

  const [screenName, setScreenName] = useState("");
  const [role, setRole] = useState("kitchen_display");
  const [branchId, setBranchId] = useState("");
  const [rotateConfirmationDeviceId, setRotateConfirmationDeviceId] = useState<string | null>(null);
  const [operatorApproved, setOperatorApproved] = useState(false);

  const utils = trpc.useUtils();

  const disableMutation = trpc.operationalDevice.management.disable.useMutation({
    onSuccess: () => {
      void utils.operationalDevice.fleet.queryScreens.invalidate();
      cancel();
    },
  });

  const createMutation = trpc.operationalDevice.management.create.useMutation({
    onSuccess: (result) => {
      const credentials = {
        deviceId: result.device.deviceId,
        tokenId: result.token.tokenId,
        secret: result.token.secret,
        activationCode: result.activationCode,
        qrPayload: result.qrPayload as Record<string, unknown>,
      };
      const next = provisioningSessionManager.createSession({
        restaurantId,
        displayName: result.device.displayName,
        role: result.device.role,
        deviceId: result.device.deviceId,
        credentials,
      });
      setSessionState(next);
      navigateToProvisioning(
        { restaurantId, sessionId: next.sessionId, mode: "resume" },
        { replace: true }
      );
      void utils.operationalDevice.fleet.queryScreens.invalidate();
      void utils.operationalDevice.fleet.getKpis.invalidate({ restaurantId });
    },
  });

  const rotateMutation = trpc.operationalDevice.management.rotateToken.useMutation({
    onSuccess: (result, variables) => {
      const credentials = {
        deviceId: result.qrPayload.deviceId as string,
        tokenId: result.token.tokenId,
        secret: result.token.secret,
        activationCode: result.activationCode,
        qrPayload: result.qrPayload as Record<string, unknown>,
      };
      const existing = session ?? provisioningSessionManager.loadSession(urlState.sessionId ?? "");
      const next = provisioningSessionManager.beginRotateSession({
        restaurantId,
        displayName: existing?.displayName ?? result.qrPayload.displayName ?? "",
        role: existing?.role ?? (result.qrPayload.role as string) ?? "kitchen_display",
        deviceId: variables.deviceId,
        credentials,
      });
      setSessionState(next);
      setOperatorApproved(false);
      setRotateConfirmationDeviceId(null);
      navigateToProvisioning(
        { restaurantId, sessionId: next.sessionId, mode: "rotate" },
        { replace: true }
      );
      void utils.operationalDevice.fleet.queryScreens.invalidate();
    },
  });

  const fleetRotateDeviceId =
    requiresRotateConfirmation(urlState) && !session?.credentials ? urlState.deviceId : null;

  const rotateConfirmationTarget = rotateConfirmationDeviceId ?? fleetRotateDeviceId;

  const executeRotate = (deviceId: string) => {
    if (rotateMutation.isPending) return;
    rotateMutation.mutate({ restaurantId, deviceId });
  };

  useEffect(() => {
    setRotateConfirmationDeviceId(null);
    setOperatorApproved(false);
  }, [urlState.deviceId, urlState.mode]);

  useEffect(() => {
    if (urlState.mode === "status") return;
    if (!session || urlState.sessionId) return;
    navigateToProvisioning(
      {
        restaurantId,
        sessionId: session.sessionId,
        mode: urlState.mode ?? "create",
        deviceId: urlState.deviceId,
      },
      { replace: true }
    );
  }, [session?.sessionId, restaurantId, urlState.sessionId, urlState.mode, urlState.deviceId]);

  if (workspace.session === null && !createMutation.isPending && !rotateMutation.isPending) {
    if (urlState.mode === "create" || !urlState.sessionId) {
      // draft session created by hook
    }
  }

  const showCreateForm =
    session != null &&
    session.status === "created" &&
    !session.credentials &&
    session.mode === "create";

  if (createMutation.error && isEmailNotVerifiedError(createMutation.error)) {
    return <VerificationRequiredPanel variant="operations" />;
  }

  const isOperational = health?.status === "operational";
  const isStatusMode = urlState.mode === "status";

  const showPendingApproval =
    !isStatusMode &&
    session != null &&
    session.credentials != null &&
    !operatorApproved &&
    (health?.status === "pairing" || health?.status === "connected");

  const showActivationPanel =
    !isStatusMode &&
    Boolean(session?.credentials?.activationCode) &&
    !showPendingApproval;

  return (
    <OperationalWorkspaceShell
      title={
        isStatusMode
          ? isAr
            ? "حالة الشاشة"
            : "Screen status"
          : isAr
            ? "مساحة تجهيز الشاشة"
            : "Screen Provisioning"
      }
      description={
        isStatusMode
          ? isAr
            ? "عرض حالة الجهاز من الخادم — للقراءة فقط"
            : "Server-sourced device status — read only"
          : isAr
            ? "دورة حياة التجهيز — الرابط، رمز التفعيل، الربط"
            : "Provisioning lifecycle — device URL, activation code, pairing"
      }
      headerAside={
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => navigateToFleet(restaurantId)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {isAr ? "الأسطول" : "Fleet"}
          </Button>
          {session?.credentials && health && !health.expired && !isStatusMode ? (
            <Button
              variant="outline"
              size="sm"
              disabled={rotateMutation.isPending}
              onClick={() => session.deviceId && setRotateConfirmationDeviceId(session.deviceId)}
            >
              {rotateMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RotateCw className="mr-2 h-4 w-4" />
              )}
              {isAr ? "تدوير الاعتماد" : "Rotate credentials"}
            </Button>
          ) : null}
        </div>
      }
      operationsBar={
        !isStatusMode && health ? (
          <OperationsBar
            items={[
              {
                id: "status",
                label: isAr ? "الحالة" : "Status",
                value: health.status,
              },
              {
                id: "pairing",
                label: isAr ? "الربط" : "Pairing",
                value: health.pairingState,
              },
              {
                id: "activation",
                label: isAr ? "التفعيل" : "Activation",
                value: health.activationState,
              },
              {
                id: "retries",
                label: isAr ? "إعادة المحاولة" : "Retries",
                value: health.retryCount,
              },
            ]}
          />
        ) : null
      }
    >
      {isStatusMode ? (
        isStatusLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : statusView ? (
          <DeviceOperationalStatusPanel statusView={statusView} language={language} />
        ) : (
          <p className="py-16 text-center text-muted-foreground">
            {isAr ? "تعذر تحميل حالة الجهاز." : "Unable to load device status."}
          </p>
        )
      ) : null}

      {resumeSessionMissing ? (
        <div className="mt-6 max-w-lg space-y-3 rounded-2xl border border-border/40 bg-muted/10 p-6 text-sm">
          <p className="font-medium">
            {isAr ? "جلسة التجهيز غير موجودة" : "Provisioning session not found"}
          </p>
          <p className="text-muted-foreground">
            {isAr
              ? "انتهت صلاحية الجلسة المحلية أو تم مسحها. استخدم «الحالة» لعرض حالة الجهاز، أو «تجهيز» لإصدار اعتماد جديد بعد التأكيد."
              : "The local provisioning session expired or was cleared. Use Status to view the device, or Provision to issue new credentials after confirmation."}
          </p>
          {urlState.deviceId ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                navigateToProvisioning({
                  restaurantId,
                  deviceId: urlState.deviceId,
                  mode: "status",
                })
              }
            >
              {isAr ? "عرض الحالة" : "View status"}
            </Button>
          ) : null}
        </div>
      ) : null}

      {rotateConfirmationTarget && !session?.credentials ? (
        <RotateCredentialsConfirmation
          deviceId={rotateConfirmationTarget}
          language={language}
          pending={rotateMutation.isPending}
          onConfirm={() => executeRotate(rotateConfirmationTarget)}
          onCancel={() => {
            setRotateConfirmationDeviceId(null);
            if (fleetRotateDeviceId) navigateToFleet(restaurantId);
          }}
        />
      ) : null}

      {rotateConfirmationDeviceId && session?.credentials ? (
        <RotateCredentialsConfirmation
          deviceId={rotateConfirmationDeviceId}
          language={language}
          pending={rotateMutation.isPending}
          onConfirm={() => executeRotate(rotateConfirmationDeviceId)}
          onCancel={() => setRotateConfirmationDeviceId(null)}
        />
      ) : null}

      {!isStatusMode && session && health ? (
        <ProvisioningStatusPanel
          health={health}
          displayName={session.displayName}
          language={language}
        />
      ) : null}

      {!isStatusMode && showCreateForm ? (
        <div className="mt-6 max-w-lg space-y-4 rounded-2xl border border-border/40 p-6">
          <div className="space-y-2">
            <Label htmlFor="prov-screen-name">{isAr ? "اسم الشاشة" : "Screen name"}</Label>
            <Input
              id="prov-screen-name"
              value={screenName}
              onChange={(e) => setScreenName(e.target.value)}
            />
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
            <Label htmlFor="prov-branch">{isAr ? "معرف الفرع (اختياري)" : "Branch ID (optional)"}</Label>
            <Input id="prov-branch" value={branchId} onChange={(e) => setBranchId(e.target.value)} />
          </div>
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
            {isAr ? "إنشاء وجلسة تجهيز" : "Create & start provisioning"}
          </Button>
        </div>
      ) : null}

      {!isStatusMode && showPendingApproval && session ? (
        <ProvisioningPendingDevicePanel
          session={session}
          language={language}
          pending={disableMutation.isPending}
          onApprove={() => setOperatorApproved(true)}
          onReject={() => {
            if (session.deviceId) {
              disableMutation.mutate({ restaurantId, deviceId: session.deviceId });
            }
          }}
        />
      ) : null}

      {!isStatusMode && showActivationPanel && session?.credentials && health ? (
        <ProvisioningActivationPanel
          activationCode={session.credentials.activationCode}
          credentials={session.credentials}
          health={health}
          language={language}
        />
      ) : null}

      {!isStatusMode && createMutation.error ? (
        <RestaurantSectionError
          message={createMutation.error.message}
          retryLabel={isAr ? "إعادة المحاولة" : "Retry"}
          onRetry={() => createMutation.reset()}
        />
      ) : null}

      {!isStatusMode && health?.expired ? (
        <div className="mt-4 flex gap-2">
          <Button onClick={retry}>{isAr ? "تمديد الجلسة" : "Extend session"}</Button>
          <Button variant="outline" onClick={cancel}>
            {isAr ? "إلغاء" : "Cancel"}
          </Button>
        </div>
      ) : null}

      {!isStatusMode && isOperational ? (
        <div className="mt-6 flex flex-col items-center gap-3 rounded-2xl border border-emerald-500/40 bg-emerald-500/5 p-6">
          <CheckCircle2 className="h-12 w-12 text-emerald-500" />
          <p className="text-center text-sm text-muted-foreground">
            {isAr ? "الشاشة تشغيلية — يمكنك العودة إلى الأسطول" : "Screen is operational — return to fleet"}
          </p>
          <Button onClick={() => navigateToFleet(restaurantId)}>
            {isAr ? "العودة إلى الأسطول" : "Back to fleet"}
          </Button>
        </div>
      ) : null}

      {import.meta.env.DEV && diagnostics ? (
        <details className="mt-6 rounded-lg border border-border/40 p-3 text-xs">
          <summary className="cursor-pointer font-medium">Provisioning diagnostics</summary>
          <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap text-[10px] text-muted-foreground">
            {JSON.stringify(diagnostics, null, 2)}
          </pre>
        </details>
      ) : null}

      {!isStatusMode &&
      (createMutation.isPending || rotateMutation.isPending) &&
      !session?.credentials ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : null}
    </OperationalWorkspaceShell>
  );
}
