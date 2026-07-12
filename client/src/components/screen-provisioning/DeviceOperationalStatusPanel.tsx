import type { DeviceStatusView } from "@/lib/screen-provisioning/useProvisioningWorkspace";
import { FleetOperatorStatusPill } from "@/components/screen-management/FleetOperatorStatusPill";
import { resolveOperatorFleetStatus } from "@/lib/screen-management/operatorFleetPresentation";
import { presenceLabel, screenStatusLabel, screenTypeLabel } from "@/lib/operational-screen/screenLabels";
import { ProvisioningStatusPanel } from "./ProvisioningStatusPanel";

/** Read-only screen status — server-sourced fleet projection, no credentials. */
export function DeviceOperationalStatusPanel({
  statusView,
  language,
}: {
  statusView: DeviceStatusView;
  language: string;
}) {
  const isAr = language === "ar";
  const { fleetScreen, device, health } = statusView;
  const operatorStatus = resolveOperatorFleetStatus(fleetScreen);

  return (
    <div className="space-y-4">
      <ProvisioningStatusPanel
        health={health}
        displayName={statusView.displayName}
        language={language}
      />
      <dl className="grid gap-3 rounded-2xl border border-border/40 bg-muted/10 p-4 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted-foreground">{isAr ? "نوع الشاشة" : "Screen type"}</dt>
          <dd className="font-medium">{screenTypeLabel(fleetScreen.role, language)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{isAr ? "الاتصال" : "Connection"}</dt>
          <dd className="font-medium">
            {presenceLabel(fleetScreen.healthSummary.presence, language)}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{isAr ? "الحالة" : "Status"}</dt>
          <dd>
            <FleetOperatorStatusPill kind={operatorStatus} language={language} />
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{isAr ? "تفعيل الشاشة" : "Screen enabled"}</dt>
          <dd className="font-medium">
            {device ? screenStatusLabel(device.status, language) : "—"}
          </dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-muted-foreground">{isAr ? "معرّف الشاشة" : "Screen ID"}</dt>
          <dd className="font-mono text-xs">{statusView.deviceId}</dd>
        </div>
      </dl>
      <p className="text-xs text-muted-foreground">
        {isAr
          ? "عرض للقراءة فقط — لا يغيّر الوصول أو إعدادات الشاشة."
          : "Read-only view — does not change access or screen settings."}
      </p>
    </div>
  );
}
