/**
 * SUBSCRIPTION-VALIDATION-1 — on-page push enrollment diagnostics (?pushTrace=1).
 */

import type { PushActivationDiagnostics } from "@/lib/pushSubscriptionState";
import {
  getActivationTraceSnapshot,
  isActivationTraceEnabled,
  type ActivationTraceSnapshot,
} from "@/lib/activationTrace";
import { isPushTraceEnabled } from "@/lib/customerPushDiagnostics";

type PushTraceDiagnosticsPanelProps = {
  diagnostics: PushActivationDiagnostics | null;
  activationTrace?: ActivationTraceSnapshot | null;
  language: "ar" | "en";
};

export function PushTraceDiagnosticsPanel({
  diagnostics,
  activationTrace,
  language,
}: PushTraceDiagnosticsPanelProps) {
  if (!isPushTraceEnabled() && !isActivationTraceEnabled()) return null;

  const snap = diagnostics?.support;
  const trace = diagnostics?.enrollmentTrace;
  const uiTrace = activationTrace ?? getActivationTraceSnapshot();
  const rows: Array<{ label: string; value: string }> = [
    { label: "permission (before)", value: diagnostics?.permissionBefore ?? "—" },
    { label: "permission (after)", value: diagnostics?.permissionAfter ?? "—" },
    { label: "pushManager", value: snap ? String(snap.pushManager) : "—" },
    { label: "serviceWorker", value: snap ? String(snap.serviceWorker) : "—" },
    { label: "notification", value: snap ? String(snap.notification) : "—" },
    { label: "pushSubscribed", value: diagnostics ? String(diagnostics.pushSubscribed) : "—" },
    {
      label: "pushSubscribeReason",
      value: diagnostics?.pushSubscribeReason ?? "—",
    },
    {
      label: "pushSubscriptionState",
      value: diagnostics?.pushSubscriptionState ?? "—",
    },
    { label: "failureStage", value: trace?.failureStage ?? "—" },
    { label: "lastStage", value: trace?.lastStage ?? "—" },
    { label: "subscriptionId", value: trace?.subscriptionId != null ? String(trace.subscriptionId) : "—" },
    { label: "subscribeHttpStatus", value: trace?.httpStatus != null ? String(trace.httpStatus) : "—" },
    {
      label: "stages",
      value: trace?.stages.length ? trace.stages.join(" → ") : "—",
    },
    { label: "isIosSafariTab", value: diagnostics ? String(diagnostics.isIosSafariTab) : "—" },
    { label: "ui.enrollmentComplete", value: String(uiTrace.enrollmentComplete) },
    { label: "ui.pushSubscribed", value: String(uiTrace.pushSubscribed) },
    { label: "ui.lastStage", value: uiTrace.lastStage ?? "—" },
    { label: "ui.stages", value: uiTrace.stages.length ? uiTrace.stages.join(" → ") : "—" },
    { label: "ui.error", value: uiTrace.errorMessage ?? "—" },
  ];

  return (
    <div
      className="rounded-lg border border-dashed border-slate-400/60 bg-slate-50/90 dark:bg-slate-900/40 px-3 py-2 text-xs font-mono space-y-1"
      dir="ltr"
    >
      <p className="font-sans font-semibold text-slate-700 dark:text-slate-200">
        {language === "ar" ? "تشخيص الاشتراك (pushTrace)" : "Push enrollment trace"}
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
