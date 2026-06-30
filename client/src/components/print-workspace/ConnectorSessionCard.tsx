import { HealthStatusBadge } from "@/components/print-workspace/HealthStatusBadge";
import { formatTimestamp } from "@/lib/print-workspace/viewModels";
import type { RouterOutputs } from "@/lib/trpc";
import { Link2, Loader2 } from "lucide-react";

type SessionStatus = RouterOutputs["printWorkspace"]["read"]["getConnectorSessionStatus"];

function Field({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-sm text-slate-200">{value}</p>
    </div>
  );
}

export function ConnectorSessionCard({
  language,
  status,
  isLoading,
}: {
  language: string;
  status: SessionStatus | undefined;
  isLoading: boolean;
}) {
  const isAr = language === "ar";

  if (isLoading) {
    return (
      <div className="flex justify-center rounded-xl border border-slate-800 bg-slate-900/40 py-10">
        <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
      </div>
    );
  }

  const data = status ?? {
    sessionState: "unregistered" as const,
    authentication: "Not connected" as const,
    registration: "Not registered" as const,
    transport: "Connector Session",
    connectedSince: null,
    lastActivityAt: null,
  };

  const authLabel =
    data.authentication === "Authenticated"
      ? isAr
        ? "مصادق"
        : "Authenticated"
      : isAr
        ? "غير متصل"
        : "Not connected";

  const registrationLabel =
    data.registration === "Registered"
      ? isAr
        ? "مسجل"
        : "Registered"
      : isAr
        ? "غير مسجل"
        : "Not registered";

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-slate-800 p-2 text-slate-300">
            <Link2 className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold text-white">
              {isAr ? "جلسة الموصل" : "Connector Session"}
            </p>
            <p className="text-xs text-slate-400">
              {isAr ? "اتصال آمن بالسحابة" : "Secure cloud session"}
            </p>
          </div>
        </div>
        <HealthStatusBadge state={data.sessionState} language={language} />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Field label={isAr ? "حالة الجلسة" : "Session state"} value={registrationLabel} />
        <Field label={isAr ? "المصادقة" : "Authentication"} value={authLabel} />
        <Field label={isAr ? "التسجيل" : "Registration"} value={registrationLabel} />
        <Field label={isAr ? "النقل" : "Transport"} value={data.transport} />
        <Field
          label={isAr ? "متصل منذ" : "Connected since"}
          value={formatTimestamp(data.connectedSince, language)}
        />
        <Field
          label={isAr ? "آخر نشاط" : "Last activity"}
          value={formatTimestamp(data.lastActivityAt, language)}
        />
      </div>
    </div>
  );
}
