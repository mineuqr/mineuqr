import { ReportsCommercialBody } from "@/components/admin/domains/reports";
import { CustomerSuccessCommercialSections } from "@/components/admin/domains/customer-success";

/** Commercial page body — Reports domain + Customer Success sections (legacy order). */
export function CommercialOverviewSections() {
  return (
    <ReportsCommercialBody betweenMetadataAndPlan={<CustomerSuccessCommercialSections />} />
  );
}
