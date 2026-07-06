import { AlertTriangle } from "lucide-react";
import { useRuntimeContext } from "./OperationalScreenRuntimeProvider";
import { toOperatorRuntimeMessage } from "@/lib/operational-screen/runtimeOperatorMessages";
import { cn } from "@/lib/utils";

/** Production runtime alert — surfaces canonical screen state errors (operator-safe). */
export function RuntimeOperationalAlert({ className }: { className?: string }) {
  const context = useRuntimeContext();
  const language = context.presentation.language;
  const errors = context.screenState.errors;

  if (errors.length === 0) return null;

  return (
    <div
      className={cn(
        "mb-4 space-y-2 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive",
        className
      )}
      role="alert"
      data-runtime-errors={errors.length}
    >
      {errors.map((error) => (
        <div key={`${error.code}:${error.message}`} className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{toOperatorRuntimeMessage(error, language)}</p>
        </div>
      ))}
    </div>
  );
}
