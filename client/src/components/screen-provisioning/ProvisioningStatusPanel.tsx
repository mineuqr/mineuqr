import type { ProvisioningHealth } from "@/lib/screen-provisioning/provisioningSessionContract";

const STATUS_LABELS: Record<string, { en: string; ar: string }> = {
  created: { en: "Created", ar: "تم الإنشاء" },
  credentials_ready: { en: "Credentials ready", ar: "بيانات الاعتماد جاهزة" },
  waiting_for_pairing: { en: "Waiting for pairing", ar: "في انتظار الربط" },
  pairing: { en: "Pairing", ar: "جاري الربط" },
  connected: { en: "Connected", ar: "متصل" },
  activating: { en: "Activating", ar: "جاري التفعيل" },
  operational: { en: "Operational", ar: "تشغيلي" },
  expired: { en: "Expired", ar: "منتهي" },
  cancelled: { en: "Cancelled", ar: "ملغى" },
  failed: { en: "Failed", ar: "فشل" },
};

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
  const label = STATUS_LABELS[health.status] ?? { en: health.status, ar: health.status };
  const minutes = Math.floor(health.secondsRemaining / 60);
  const seconds = health.secondsRemaining % 60;

  return (
    <div className="rounded-2xl border border-border/40 bg-muted/10 p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold">{displayName || (isAr ? "شاشة جديدة" : "New screen")}</h3>
        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          {isAr ? label.ar : label.en}
        </span>
      </div>
      <dl className="grid gap-2 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-muted-foreground">{isAr ? "الربط" : "Pairing"}</dt>
          <dd className="font-medium">{health.pairingState}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{isAr ? "التفعيل" : "Activation"}</dt>
          <dd className="font-medium">{health.activationState}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{isAr ? "الوقت المتبقي" : "Time remaining"}</dt>
          <dd className="font-medium tabular-nums">
            {health.expired
              ? isAr
                ? "منتهي"
                : "Expired"
              : `${minutes}:${String(seconds).padStart(2, "0")}`}
          </dd>
        </div>
      </dl>
    </div>
  );
}
