import type { SlaSnapshot } from "./slaEngine";

export type DelayReason =
  | "waiting-acceptance"
  | "preparing-sla-exceeded"
  | "ready-not-served"
  | "printing-failed"
  | "on-track"
  | "completed";

export function explainDelay(input: {
  status: string;
  sla: SlaSnapshot;
  printingFailed?: boolean;
  isAr: boolean;
}): { reason: DelayReason; message: string } {
  if (input.printingFailed) {
    return {
      reason: "printing-failed",
      message: input.isAr ? "فشلت الطباعة — راجع مساحة الطباعة" : "Printing failed — check Print Workspace",
    };
  }

  if (input.status === "pending") {
    if (input.sla.status === "on-time" || input.sla.status === "at-risk") {
      return {
        reason: "waiting-acceptance",
        message: input.isAr ? "بانتظار قبول الطلب" : "Waiting for order acceptance",
      };
    }
    return {
      reason: "waiting-acceptance",
      message: input.isAr
        ? "تأخر قبول الطلب — يلزم قبول الطلب"
        : "Acceptance delayed — accept the order",
    };
  }

  if (input.status === "preparing") {
    if (input.sla.status === "late" || input.sla.status === "critical") {
      return {
        reason: "preparing-sla-exceeded",
        message: input.isAr
          ? `تجاوز وقت التحضير (${Math.floor(input.sla.lateSeconds / 60)} د)`
          : `Preparation exceeded SLA (${Math.floor(input.sla.lateSeconds / 60)}m late)`,
      };
    }
    return {
      reason: "on-track",
      message: input.isAr ? "التحضير ضمن الوقت المتوقع" : "Preparation on track",
    };
  }

  if (input.status === "ready") {
    if (input.sla.status === "late" || input.sla.status === "critical") {
      return {
        reason: "ready-not-served",
        message: input.isAr
          ? "جاهز ولم يُقدَّم بعد — يلزم تقديم الطلب"
          : "Ready but not served — serve the order",
      };
    }
    return {
      reason: "on-track",
      message: input.isAr ? "جاهز للتقديم" : "Ready for service",
    };
  }

  if (input.status === "served" || input.status === "cancelled") {
    return {
      reason: "completed",
      message: input.isAr ? "مكتمل" : "Completed",
    };
  }

  return {
    reason: "on-track",
    message: input.isAr ? "ضمن الوقت المتوقع" : "On track",
  };
}
