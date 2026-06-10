import type { ReactNode } from "react";

import { ReportsCommercialPageContent } from "./ReportsCommercialPageContent";

type ReportsCommercialBodyProps = {
  betweenMetadataAndPlan?: ReactNode;
};

/** Reports domain — commercial page reporting sections. */
export function ReportsCommercialBody({
  betweenMetadataAndPlan,
}: ReportsCommercialBodyProps) {
  return (
    <ReportsCommercialPageContent betweenMetadataAndPlan={betweenMetadataAndPlan} />
  );
}
