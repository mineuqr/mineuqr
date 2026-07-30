/**
 * COMMERCIAL-CAPABILITY-EXPERIENCE-1
 * Lifecycle rail: Draft → Approved → Published → Retired → Archived
 */

import { PlatformOpsStatusBadge } from "@/design-system/platform-ops-ui";
import { useCatalogI18n } from "../useCatalogI18n";
import {
  CAPABILITY_PUBLISH_LIFECYCLE,
  resolveLifecycleStage,
  type CapabilityPublishLifecycleState,
} from "./capabilityExperienceModel";
import { cn } from "@/lib/utils";

export type CapabilityLifecycleRailProps = {
  foundationState: string;
  workflowState?: string | null;
  className?: string;
};

export function CapabilityLifecycleRail({
  foundationState,
  workflowState,
  className,
}: CapabilityLifecycleRailProps) {
  const { cc } = useCatalogI18n();
  const current = resolveLifecycleStage({ foundationState, workflowState });
  const currentIndex = CAPABILITY_PUBLISH_LIFECYCLE.indexOf(current);

  return (
    <div
      className={cn("space-y-2", className)}
      data-slot="capability-lifecycle-rail"
      data-program="COMMERCIAL-CAPABILITY-EXPERIENCE-1"
      role="list"
      aria-label={cc("capabilityExperience.lifecycle.label")}
    >
      <div className="flex flex-wrap items-center gap-1">
        {CAPABILITY_PUBLISH_LIFECYCLE.map((stage, index) => {
          const active = stage === current;
          const past = index < currentIndex;
          return (
            <div key={stage} className="flex items-center gap-1" role="listitem">
              {index > 0 ? (
                <span
                  className={cn(
                    "mx-0.5 text-xs",
                    past || active
                      ? "text-foreground"
                      : "text-muted-foreground/50"
                  )}
                  aria-hidden
                >
                  →
                </span>
              ) : null}
              <PlatformOpsStatusBadge
                status={
                  active
                    ? "healthy"
                    : past
                      ? "info"
                      : "unknown"
                }
                label={cc(`capabilityExperience.lifecycle.${stage}`)}
              />
            </div>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">
        {cc("capabilityExperience.lifecycle.current").replace(
          "{state}",
          cc(`capabilityExperience.lifecycle.${current as CapabilityPublishLifecycleState}`)
        )}
      </p>
    </div>
  );
}
