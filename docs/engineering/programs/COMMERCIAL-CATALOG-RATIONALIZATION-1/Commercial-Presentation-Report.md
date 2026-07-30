# Commercial Presentation Report

## Surfaces adopted

| Surface | Adoption |
|---------|----------|
| CapabilityFilterPicker | Presentation registry + rules |
| CapabilityPricingPreview | Comparison cards + presentation names |
| PlanCreationWizard / Feature bundle create | `normalizePlanFeatures` before persist |
| Pricing page | `projectFeatureKeysForCommercialDisplay` + presentation i18n |
| Locales AR/EN | `presentation.*` + renamed feature labels |

## Customer vs engineering

Engineering Projection IDs remain developer-visible via “show registry keys”.  
Customer-facing names and grouping follow AA commercial decisions.
