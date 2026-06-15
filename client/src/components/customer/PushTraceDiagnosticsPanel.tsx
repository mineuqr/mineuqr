/**
 * PUSH-SUBSCRIPTION-HARDENING-1 — on-page push diagnostics (?pushTrace=1).
 */

import type { PushActivationDiagnostics } from "@/lib/pushSubscriptionState";
import { isPushTraceEnabled } from "@/lib/customerPushDiagnostics";

type PushTraceDiagnosticsPanelProps = {
  diagnostics: PushActivationDiagnostics | null;
  language: "ar" | "en";
};

export function PushTraceDiagnosticsPanel({
  diagnostics,
  language,
}: PushTraceDiagnosticsPanelProps) {
  if (!isPushTraceEnabled()) return null;

  const snap = diagnostics?.support;
  const rows: Array<{ label: string; value: string }> = [
    { label: "permission (before)", value: diagnostics?.permissionBefore ?? "—" },
    { label: "permission (after)", value: diagnostics?.permissionAfter ?? "—" },
    { label: "pushManager", value: snap ? String(snap.pushManager) : "—" },
    { label: "serviceWorker", value: snap ? String(snap.serviceWorker) : "—" },
    { label: "notification", value: snap ? String(snap.notification) : "—" },
    { label: "iosStandalone", value: snap ? String(snap.iosStandalone) : "—" },
    { label: "displayModeStandalone", value: snap ? String(snap.displayModeStandalone) : "—" },
    { label: "pushSubscribed", value: diagnostics ? String(diagnostics.pushSubscribed) : "—" },
    {
      label: "pushSubscribeReason",
      value: diagnostics?.pushSubscribeReason ?? "—",
    },
    {
      label: "pushSubscriptionState",
      value: diagnostics?.pushSubscriptionState ?? "—",
    },
    { label: "isIosSafariTab", value: diagnostics ? String(diagnostics.isIosSafariTab) : "—" },
  ];

  return (
    <div
      className="rounded-lg border border-dashed border-slate-400/60 bg-slate-50/90 dark:bg-slate-900/40 px-3 py-2 text-xs font-mono space-y-1"
      dir="ltr"
    >
      <p className="font-sans font-semibold text-slate-700 dark:text-slate-200">
        {language === "ar" ? "تشخيص الدفع (pushTrace)" : "Push trace diagnostics"}
      </p>
      {rows.map((row) => (
        <div key={row.label} className="flex gap-2">
          <span className="text-muted-foreground shrink-0">{row.label}:</span>
          <span className="break-all">{row.value}</span>
        </div>
      ))}
    </div>
  );
}
