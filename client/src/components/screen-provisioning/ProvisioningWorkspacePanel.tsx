import { useAuth } from "@/_core/hooks/useAuth";
import { VerificationRequiredPanel } from "@/components/auth/VerificationRequiredPanel";
import { OperationalWorkspaceShell } from "@/components/operational-workspace/OperationalWorkspaceShell";
import { OperationsBar } from "@/components/operational-workspace/OperationsBar";
import { ProvisioningCredentialsPanel } from "@/components/screen-provisioning/ProvisioningCredentialsPanel";
import { ProvisioningStatusPanel } from "@/components/screen-provisioning/ProvisioningStatusPanel";
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
  readProvisioningUrlState,
} from "@/lib/screen-provisioning/provisioningUrl";
import { useProvisioningWorkspace } from "@/lib/screen-provisioning/useProvisioningWorkspace";
import { restaurantQueriesEnabled } from "@/lib/queryRuntime";
import { isEmailNotVerifiedError } from "@/lib/trpcErrors";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, CheckCircle2, Loader2, RotateCw } from "lucide-react";
import { useEffect, useState } from "react";

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
  const urlState = readProvisioningUrlState();

  const workspace = useProvisioningWorkspace(restaurantId, enabled);
  const { session, health, diagnostics, setSessionState, retry, cancel } = workspace;

  const [screenName, setScreenName] = useState("");
  const [role, setRole] = useState("kitchen_display");
  const [branchId, setBranchId] = useState("");

  const utils = trpc.useUtils();

  const createMutation = trpc.operationalDevice.management.create.useMutation({
    onSuccess: (result) => {
      const credentials = {
        deviceId: result.device.deviceId,
        tokenId: result.token.tokenId,
        secret: result.token.secret,
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
        qrPayload: result.qrPayload as Record<string, unknown>,
      };
      const existing = session ?? provisioningSessionManager.loadSession(urlState.sessionId ?? "");
      const next = provisioningSessionManager.beginRotateSession({
        restaurantId,
        displayName: existing?.displayName ?? "",
        role: existing?.role ?? "kitchen_display",
        deviceId: variables.deviceId,
        credentials,
      });
      setSessionState(next);
      navigateToProvisioning(
        { restaurantId, sessionId: next.sessionId, mode: "rotate" },
        { replace: true }
      );
      void utils.operationalDevice.fleet.queryScreens.invalidate();
    },
  });

  useEffect(() => {
    if (!enabled || !urlState.deviceId || session?.credentials) return;
    if (urlState.mode !== "rotate") return;
    if (rotateMutation.isPending || rotateMutation.isSuccess) return;
    rotateMutation.mutate({ restaurantId, deviceId: urlState.deviceId });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- rotate once on fleet handoff
  }, [enabled, urlState.deviceId, urlState.mode, session?.credentials]);

  useEffect(() => {
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

  return (
    <OperationalWorkspaceShell
      title={isAr ? "مساحة تجهيز الشاشة" : "Screen Provisioning"}
      description={
        isAr
          ? "دورة حياة التجهيز — الاعتماد، الربط، التفعيل"
          : "Provisioning lifecycle — credentials, pairing, activation"
      }
      headerAside={
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => navigateToFleet(restaurantId)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {isAr ? "الأسطول" : "Fleet"}
          </Button>
          {session?.credentials && health && !health.expired ? (
            <Button
              variant="outline"
              size="sm"
              disabled={rotateMutation.isPending}
              onClick={() =>
                session.deviceId &&
                rotateMutation.mutate({ restaurantId, deviceId: session.deviceId })
              }
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
        health ? (
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
      {session && health ? (
        <ProvisioningStatusPanel
          health={health}
          displayName={session.displayName}
          language={language}
        />
      ) : null}

      {showCreateForm ? (
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

      {session?.credentials ? (
        <div className="mt-6">
          <ProvisioningCredentialsPanel credentials={session.credentials} language={language} />
        </div>
      ) : null}

      {createMutation.error ? (
        <RestaurantSectionError
          message={createMutation.error.message}
          retryLabel={isAr ? "إعادة المحاولة" : "Retry"}
          onRetry={() => createMutation.reset()}
        />
      ) : null}

      {health?.expired ? (
        <div className="mt-4 flex gap-2">
          <Button onClick={retry}>{isAr ? "تمديد الجلسة" : "Extend session"}</Button>
          <Button variant="outline" onClick={cancel}>
            {isAr ? "إلغاء" : "Cancel"}
          </Button>
        </div>
      ) : null}

      {isOperational ? (
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

      {(createMutation.isPending || rotateMutation.isPending) && !session?.credentials ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : null}
    </OperationalWorkspaceShell>
  );
}
