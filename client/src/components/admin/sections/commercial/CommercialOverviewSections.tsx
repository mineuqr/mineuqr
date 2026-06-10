import { ReportsCommercialBody } from "@/components/admin/domains/reports";
import { CommercialCustomerSuccessSections } from "./CommercialCustomerSuccessSections";

/** Commercial page body — Reports domain + Customer Success sections (legacy order). */
export function CommercialOverviewSections() {
  return (
    <ReportsCommercialBody betweenMetadataAndPlan={<CommercialCustomerSuccessSections />} />
  );
}
