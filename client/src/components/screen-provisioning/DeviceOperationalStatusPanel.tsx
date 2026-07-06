import type { DeviceStatusView } from "@/lib/screen-provisioning/useProvisioningWorkspace";
import { presenceLabel, screenStatusLabel, screenTypeLabel } from "@/lib/operational-screen/screenLabels";
import { ProvisioningStatusPanel } from "./ProvisioningStatusPanel";

/** Read-only device status — server-sourced fleet projection, no credentials. */
export function DeviceOperationalStatusPanel({
  statusView,
  language,
}: {
  statusView: DeviceStatusView;
  language: string;
}) {
  const isAr = language === "ar";
  const { fleetScreen, device, health } = statusView;

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
          <dt className="text-muted-foreground">{isAr ? "الاتصال" : "Presence"}</dt>
          <dd className="font-medium">
            {presenceLabel(fleetScreen.healthSummary.presence, language)}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{isAr ? "حالة الجهاز" : "Device status"}</dt>
          <dd className="font-medium">
            {device ? screenStatusLabel(device.status, language) : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{isAr ? "الحالة التشغيلية" : "Operational state"}</dt>
          <dd className="font-medium">{fleetScreen.canonicalState.operationalState}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{isAr ? "جاهزية العمل" : "Business readiness"}</dt>
          <dd className="font-medium">{fleetScreen.businessReadiness}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{isAr ? "رمز الجهاز" : "Device ID"}</dt>
          <dd className="font-mono text-xs">{statusView.deviceId}</dd>
        </div>
      </dl>
      <p className="text-xs text-muted-foreground">
        {isAr
          ? "عرض للقراءة فقط — لا يغيّر بيانات الاعتماد ولا حالة التجهيز."
          : "Read-only view — does not change credentials or provisioning state."}
      </p>
    </div>
  );
}
