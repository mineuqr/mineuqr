import { RestaurantSectionEmpty, RestaurantSectionError } from "./RestaurantSectionStates";
import { sessionSummaryLabel } from "@/lib/diningSessionWorkspaceCopy";
import { SearchX } from "lucide-react";

type Lang = "ar" | "en";

export function DiningSessionWorkspaceRecovery({
  kind,
  language,
  onRetry,
  isFetching = false,
}: {
  kind: "notFound" | "loadError";
  language: Lang;
  onRetry?: () => void;
  isFetching?: boolean;
}) {
  if (kind === "notFound") {
    return (
      <RestaurantSectionEmpty
        icon={SearchX}
        message={sessionSummaryLabel("sessionNotFound", language)}
      />
    );
  }

  return (
    <RestaurantSectionError
      message={sessionSummaryLabel("loadError", language)}
      retryLabel={language === "ar" ? "إعادة المحاولة" : "Retry"}
      onRetry={onRetry ?? (() => undefined)}
      isFetching={isFetching}
    />
  );
}

function WorkspaceSectionSkeleton() {
  return (
    <div className="animate-pulse rounded-xl border border-cyan-500/15 bg-slate-900/40 p-4">
      <div className="mb-3 h-4 w-28 rounded bg-slate-800/70" />
      <div className="grid grid-cols-2 gap-3">
        {[0, 1, 2, 3].map((index) => (
          <div key={index} className="space-y-2">
            <div className="h-3 w-16 rounded bg-slate-800/50" />
            <div className="h-4 w-24 rounded bg-slate-800/70" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function DiningSessionWorkspaceSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <WorkspaceSectionSkeleton />
      <WorkspaceSectionSkeleton />
      <WorkspaceSectionSkeleton />
    </div>
  );
}
