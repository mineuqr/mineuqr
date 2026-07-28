/**
 * GLOBAL-SAAS-CORPORATE-IDENTITY-1
 * Trust Center resource catalog — single source for hub + footer trust links.
 * Only published entries appear in the public Trust Center.
 */
export type TrustResourceCategory =
  | "security"
  | "privacy"
  | "billing"
  | "legal"
  | "compliance"
  | "ops";

export type TrustResource = {
  id: string;
  path: string;
  /** Locale key under trust.resources.* */
  titleKey: string;
  descriptionKey: string;
  category: TrustResourceCategory;
  /** When false, listed only in architecture docs — not on the public hub */
  published: boolean;
};

export const TRUST_CENTER_RESOURCES: readonly TrustResource[] = [
  {
    id: "security",
    path: "/security",
    titleKey: "trust.resources.securityTitle",
    descriptionKey: "trust.resources.securityDesc",
    category: "security",
    published: true,
  },
  {
    id: "privacy",
    path: "/privacy",
    titleKey: "trust.resources.privacyTitle",
    descriptionKey: "trust.resources.privacyDesc",
    category: "privacy",
    published: true,
  },
  {
    id: "billing",
    path: "/billing",
    titleKey: "trust.resources.billingTitle",
    descriptionKey: "trust.resources.billingDesc",
    category: "billing",
    published: true,
  },
  {
    id: "terms",
    path: "/terms",
    titleKey: "trust.resources.termsTitle",
    descriptionKey: "trust.resources.termsDesc",
    category: "legal",
    published: true,
  },
  {
    id: "subprocessors",
    path: "/subprocessors",
    titleKey: "trust.resources.subprocessorsTitle",
    descriptionKey: "trust.resources.subprocessorsDesc",
    category: "privacy",
    published: true,
  },
  {
    id: "dpa",
    path: "/dpa",
    titleKey: "trust.resources.dpaTitle",
    descriptionKey: "trust.resources.dpaDesc",
    category: "compliance",
    published: true,
  },
  {
    id: "disclosure",
    path: "/security/disclosure",
    titleKey: "trust.resources.disclosureTitle",
    descriptionKey: "trust.resources.disclosureDesc",
    category: "security",
    published: true,
  },
  {
    id: "docs",
    path: "/docs",
    titleKey: "trust.resources.docsTitle",
    descriptionKey: "trust.resources.docsDesc",
    category: "ops",
    published: true,
  },
  {
    id: "roadmap",
    path: "/roadmap",
    titleKey: "trust.resources.roadmapTitle",
    descriptionKey: "trust.resources.roadmapDesc",
    category: "ops",
    published: true,
  },
  {
    id: "status",
    path: "/status",
    titleKey: "trust.resources.statusTitle",
    descriptionKey: "trust.resources.statusDesc",
    category: "ops",
    published: true,
  },
] as const;

export function getPublishedTrustResources(): TrustResource[] {
  return TRUST_CENTER_RESOURCES.filter((r) => r.published);
}
