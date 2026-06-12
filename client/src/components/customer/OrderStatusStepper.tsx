import {
  getOrderStepVisualState,
  isOrderStepConnectorCompleted,
  lifecycleStepIndex,
  orderLifecycleSteps,
  orderStatusLabels,
  type OrderLifecycleStatus,
} from "@/lib/orderStatusDisplay";
import { cn } from "@/lib/utils";

type OrderStatusStepperProps = {
  status: OrderLifecycleStatus;
  language: "ar" | "en";
  /** Page direction — keeps step order: pending → served reads naturally in RTL/LTR. */
  dir: "rtl" | "ltr";
};

/**
 * PR-CUX-1B-POLISH-1 — horizontal lifecycle stepper for customer order tracking.
 * DOM order matches operational flow; RTL places pending on the right (reading start).
 */
export function OrderStatusStepper({ status, language, dir }: OrderStatusStepperProps) {
  if (status === "cancelled") return null;

  const lang = language;
  const activeStep = lifecycleStepIndex(status);
  const isServed = status === "served";

  return (
    <ol
      className="flex w-full items-center gap-0 px-0.5"
      dir={dir}
      aria-label={language === "ar" ? "مراحل الطلب" : "Order progress"}
    >
      {orderLifecycleSteps.map((step, index) => {
        const visual = getOrderStepVisualState(index, activeStep, status);
        const isLast = index === orderLifecycleSteps.length - 1;
        const connectorDone = isOrderStepConnectorCompleted(index, activeStep, status);

        return (
          <li key={step} className="flex min-w-0 flex-1 items-center">
            <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
              <div
                className={cn(
                  "h-3.5 w-3.5 shrink-0 rounded-full border-2 transition-all",
                  visual === "completed" &&
                    (isServed
                      ? "border-green-600 bg-green-600 dark:border-green-500 dark:bg-green-500"
                      : "border-orange-500 bg-orange-500"),
                  visual === "current" &&
                    "scale-110 border-orange-500 bg-orange-50 ring-2 ring-orange-500/35 dark:bg-orange-950/40",
                  visual === "future" && "border-muted-foreground/25 bg-transparent"
                )}
                aria-current={visual === "current" ? "step" : undefined}
              />
              <span
                className={cn(
                  "w-full px-0.5 text-center text-[10px] leading-tight sm:text-xs",
                  visual === "current" && "font-semibold text-orange-600 dark:text-orange-400",
                  visual === "completed" &&
                    (isServed
                      ? "font-medium text-green-700 dark:text-green-400"
                      : "font-medium text-foreground/85"),
                  visual === "future" && "text-muted-foreground"
                )}
              >
                {orderStatusLabels[step][lang]}
              </span>
            </div>
            {!isLast && (
              <div
                className={cn(
                  "mx-0.5 mb-5 h-0.5 min-w-[6px] flex-1 rounded-full transition-colors",
                  connectorDone
                    ? isServed
                      ? "bg-green-600 dark:bg-green-500"
                      : "bg-orange-500"
                    : "bg-muted-foreground/20"
                )}
                aria-hidden
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
