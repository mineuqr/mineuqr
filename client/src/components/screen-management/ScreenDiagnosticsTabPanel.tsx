import { FleetOperatorStatusPill } from "@/components/screen-management/FleetOperatorStatusPill";
import type { FleetScreenReadModel } from "@/lib/screen-fleet/fleetReadModel";
import {
  formatLastSeen,
  resolveOperatorFleetStatus,
} from "@/lib/screen-management/operatorFleetPresentation";
import { presenceLabel } from "@/lib/operational-screen/screenLabels";
import { trpc } from "@/lib/trpc";
import { Loader2 } from "lucide-react";

export function ScreenDiagnosticsTabPanel({
  screenId,
  fleetScreen,
  restaurantId,
  language,
  enabled,
}: {
  screenId: string;
  fleetScreen: FleetScreenReadModel;
  restaurantId: number;
  language: string;
  enabled: boolean;
}) {
  const isAr = language === "ar";
  const operatorStatus = resolveOperatorFleetStatus(fleetScreen);

  const deviceQuery = trpc.operationalDevice.management.get.useQuery(
    { restaurantId, deviceId: screenId },
    { enabled }
  );
  const device = deviceQuery.data ?? null;

  return (
    <div className="space-y-6 pb-4">
      <p className="text-sm text-muted-foreground">
        {isAr
          ? "للدعم الفني — لا يلزم للتشغيل اليومي."
          : "For support — not needed for daily operation."}
      </p>

      {deviceQuery.isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : null}

      <section className="space-y-3" aria-labelledby="diagnostics-connectivity-heading">
        <h3
          id="diagnostics-connectivity-heading"
          className="text-sm font-semibold uppercase tracking-wide text-muted-foreground"
        >
          {isAr ? "صحة الاتصال" : "Connection health"}
        </h3>
        <dl className="space-y-2 rounded-xl border p-4 text-sm">
          <div className="flex items-center justify-between gap-2">
            <dt className="text-muted-foreground">{isAr ? "الحالة" : "Status"}</dt>
            <dd>
              <FleetOperatorStatusPill kind={operatorStatus} language={language} />
            </dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">{isAr ? "الاتصال" : "Connection"}</dt>
            <dd>{presenceLabel(fleetScreen.healthSummary.presence, language)}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">{isAr ? "آخر نبض" : "Last heartbeat"}</dt>
            <dd>{formatLastSeen(fleetScreen.lastHeartbeat, language)}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">{isAr ? "آخر ظهور (السجل)" : "Last seen (record)"}</dt>
            <dd>
              {device?.lastSeenAt
                ? new Date(device.lastSeenAt).toLocaleString(isAr ? "ar-SA" : "en-US")
                : "—"}
            </dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">{isAr ? "اتصال نشط" : "Active access"}</dt>
            <dd>
              {fleetScreen.healthSummary.hasActiveToken ? (isAr ? "نعم" : "Yes") : isAr ? "لا" : "No"}
            </dd>
          </div>
        </dl>
      </section>

      <section className="space-y-3" aria-labelledby="diagnostics-runtime-heading">
        <h3
          id="diagnostics-runtime-heading"
          className="text-sm font-semibold uppercase tracking-wide text-muted-foreground"
        >
          {isAr ? "الإصدارات" : "Versions"}
        </h3>
        <dl className="space-y-2 rounded-xl border bg-muted/20 p-4 text-sm">
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">{isAr ? "إصدار التشغيل" : "Runtime version"}</dt>
            <dd className="font-mono text-xs">{fleetScreen.reportedVersion ?? "—"}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">{isAr ? "مراجعة الإعداد" : "Configuration revision"}</dt>
            <dd className="font-mono text-xs">
              {device?.screenConfigRevision ?? fleetScreen.configurationVersion}
            </dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">{isAr ? "إصدار الإعداد (الأسطول)" : "Config version (fleet)"}</dt>
            <dd className="font-mono text-xs">{fleetScreen.configurationVersion}</dd>
          </div>
        </dl>
      </section>

      <section className="space-y-3" aria-labelledby="diagnostics-internal-heading">
        <h3
          id="diagnostics-internal-heading"
          className="text-sm font-semibold uppercase tracking-wide text-muted-foreground"
        >
          {isAr ? "التشخيص الداخلي" : "Internal diagnostics"}
        </h3>
        <dl className="space-y-2 rounded-xl border p-4 text-xs">
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">{isAr ? "معرّف الشاشة" : "Screen ID"}</dt>
            <dd className="font-mono">{fleetScreen.screenId}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">{isAr ? "الحالة الداخلية" : "Internal state"}</dt>
            <dd className="font-mono">{fleetScreen.canonicalState.operationalState}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">{isAr ? "حالة الاتصال (داخلية)" : "Connectivity state"}</dt>
            <dd className="font-mono">{fleetScreen.canonicalState.connectivityState}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">{isAr ? "الجاهزية" : "Readiness"}</dt>
            <dd className="font-mono">{fleetScreen.businessReadiness}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">{isAr ? "حالة الصيانة" : "Maintenance state"}</dt>
            <dd className="font-mono">{fleetScreen.canonicalState.maintenanceState}</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
