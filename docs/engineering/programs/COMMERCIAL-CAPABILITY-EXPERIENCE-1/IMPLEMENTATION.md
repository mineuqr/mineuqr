# IMPLEMENTATION.md — COMMERCIAL-CAPABILITY-EXPERIENCE-1

## Summary

UX-only adoption: Capability Filters presented as first-class, domain-grouped platform objects. Legacy flat checkbox grids removed from Plan Wizard and Feature Bundle editor. No business logic, Catalog, Runtime, or Billing changes.

---

## Inventory

| Path | Role |
|------|------|
| `experience/capabilityExperienceModel.ts` | Presentation grouping + lifecycle stage helpers (reads Filter Registry) |
| `experience/CapabilityFilterPicker.tsx` | Domain-grouped picker: search, domain filter, bulk enable/disable, metrics, developer registry keys |
| `experience/CapabilityLifecycleRail.tsx` | Draft → Approved → Published → Retired → Archived |
| `experience/CapabilityPricingPreview.tsx` | Public-pricing-shaped preview with capability groups |
| `PlanCreationWizard.tsx` | Step 4 → FilterPicker; Step 9 → lifecycle + pricing preview |
| `CatalogManagementPanels.tsx` | Feature bundles → FilterPicker; Publication → LifecycleRail |
| `ExperiencePanels.tsx` | PricingPreviewPanel → CapabilityPricingPreview |
| `en.json` / `ar.json` | `capabilityExperience.*` copy + bundle title/body |
| `__tests__/commercialCapabilityExperience.guards.test.ts` | UX guards |

---

## Explicit non-changes

Capability Registry · Commercial Catalog services · Published Offerings APIs · Subscription Runtime · Billing · Checkout · Database · Enforcement
