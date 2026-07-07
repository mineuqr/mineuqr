import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import type { ProvisioningSession } from "@/lib/screen-provisioning/provisioningSessionContract";
import { SCREEN_TYPE_OPTIONS } from "@/lib/operational-screen/screenLabels";

/** Operator approval panel when a device connects during provisioning. */
export function ProvisioningPendingDevicePanel({
  session,
  language,
  pending,
  onApprove,
  onReject,
}: {
  session: ProvisioningSession;
  language: string;
  pending: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  const isAr = language === "ar";
  const roleLabel =
    SCREEN_TYPE_OPTIONS.find((o) => o.id === session.role)?.[isAr ? "ar" : "en"] ?? session.role;
  const connectedAt = new Date(session.updatedAt).toLocaleString(isAr ? "ar-SA" : "en-US");

  return (
    <div className="mt-6 max-w-lg space-y-4 rounded-2xl border border-amber-500/40 bg-amber-500/5 p-6">
      <h3 className="font-semibold">
        {isAr ? "جهاز جديد يطلب الموافقة" : "New device requesting approval"}
      </h3>
      <dl className="grid gap-2 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">{isAr ? "اسم الجهاز" : "Device name"}</dt>
          <dd className="font-medium">{session.displayName || "—"}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">{isAr ? "الدور" : "Role"}</dt>
          <dd>{roleLabel}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">{isAr ? "وقت الاتصال" : "Connection time"}</dt>
          <dd>{connectedAt}</dd>
        </div>
      </dl>
      <div className="flex gap-2">
        <Button disabled={pending} onClick={onApprove}>
          {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {isAr ? "موافقة" : "Approve"}
        </Button>
        <Button variant="outline" disabled={pending} onClick={onReject}>
          {isAr ? "رفض" : "Reject"}
        </Button>
      </div>
    </div>
  );
}
