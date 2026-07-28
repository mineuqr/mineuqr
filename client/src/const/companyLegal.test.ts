/**
 * GLOBAL-SAAS-CORPORATE-IDENTITY-1
 * Guards: company legal stays unpublished until explicitly enabled with real fields.
 */
import { describe, expect, it } from "vitest";
import {
  getPublicCompanyLegal,
  MINEUQR_COMPANY_LEGAL,
  MINEUQR_PUBLISH_COMPANY_LEGAL,
} from "@/const/companyLegal";
import { getPublishedTrustResources } from "@/const/trustCenterRegistry";
import {
  MINEUQR_PUBLIC_DOCS_URL,
  MINEUQR_PUBLIC_ROADMAP_URL,
  MINEUQR_PUBLIC_STATUS_URL,
} from "@/const/publicPresence";

describe("companyLegal post-Atlas gate", () => {
  it("does not publish legal identity before formation", () => {
    expect(MINEUQR_PUBLISH_COMPANY_LEGAL).toBe(false);
    expect(MINEUQR_COMPANY_LEGAL.legalName).toBeNull();
    expect(getPublicCompanyLegal()).toBeNull();
  });
});

describe("public presence URLs", () => {
  it("keeps optional external URLs null until configured", () => {
    expect(MINEUQR_PUBLIC_DOCS_URL).toBeNull();
    expect(MINEUQR_PUBLIC_STATUS_URL).toBeNull();
    expect(MINEUQR_PUBLIC_ROADMAP_URL).toBeNull();
  });
});

describe("trustCenterRegistry", () => {
  it("publishes core trust resources without certification pages", () => {
    const ids = getPublishedTrustResources().map((r) => r.id);
    expect(ids).toContain("security");
    expect(ids).toContain("privacy");
    expect(ids).toContain("billing");
    expect(ids).toContain("dpa");
    expect(ids).toContain("subprocessors");
    expect(ids).not.toContain("soc2");
  });
});
