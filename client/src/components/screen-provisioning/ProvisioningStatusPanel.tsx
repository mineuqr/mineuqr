import type { ProvisioningHealth } from "@/lib/screen-provisioning/provisioningSessionContract";
import {
  provisioningActivationStateLabel,
  provisioningPairingStateLabel,
  provisioningStatusLabel,
} from "@/lib/screen-management/provisioningOperatorCopy";

/** Status display — consumes projected health only. */
export function ProvisioningStatusPanel({
  health,
  displayName,
  language,
}: {
  health: ProvisioningHealth;
  displayName: string;
  language: string;
}) {
  const isAr = language === "ar";
  const statusLabel = provisioningStatusLabel(health.status, language);
  const minutes = Math.floor(health.secondsRemaining / 60);
  const seconds = health.secondsRemaining % 60;

  return (
    <div className="rounded-2xl border border-border/40 bg-muted/10 p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold">{displayName || (isAr ? "شاشة جديدة" : "New screen")}</h3>
        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          {statusLabel}
        </span>
      </div>
      <dl className="grid gap-2 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-muted-foreground">{isAr ? "الاتصال" : "Connection"}</dt>
          <dd className="font-medium">{provisioningPairingStateLabel(health.pairingState, language)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{isAr ? "التشغيل" : "Startup"}</dt>
          <dd className="font-medium">
            {provisioningActivationStateLabel(health.activationState, language)}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{isAr ? "الوقت المتبقي" : "Time remaining"}</dt>
          <dd className="font-medium tabular-nums">
            {health.expired
              ? isAr
                ? "انتهى"
                : "Expired"
              : `${minutes}:${String(seconds).padStart(2, "0")}`}
          </dd>
        </div>
      </dl>
    </div>
  );
}
