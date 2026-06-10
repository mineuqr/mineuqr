import { CustomerSuccessAttentionSection } from "./CustomerSuccessAttentionSection";
import { CustomerSuccessHealthSection } from "./CustomerSuccessHealthSection";

/** Customer Success sections surfaced on the commercial page (legacy order). */
export function CustomerSuccessCommercialSections() {
  return (
    <>
      <CustomerSuccessHealthSection />
      <CustomerSuccessAttentionSection />
    </>
  );
}
