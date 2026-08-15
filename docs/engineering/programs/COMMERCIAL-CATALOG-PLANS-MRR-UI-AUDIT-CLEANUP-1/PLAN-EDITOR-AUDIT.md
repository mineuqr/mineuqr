# PLAN-EDITOR-AUDIT.md

Surface: `PlanCreationWizard` (no second editor).

| Field | Class | Source |
|-------|-------|--------|
| Plan identity (selector, code) | VISIBLE / code LOCKED | `plansQuery` |
| Commercial name | VISIBLE | plan.name |
| Description | VISIBLE | plan.description |
| Capabilities | VISIBLE | `CapabilityFilterPicker` |
| Limits restaurants/categories/items | VISIBLE | `LivePlanLimitsEditor` |
| Monthly / yearly USD | VISIBLE | `pricesQuery` |
| SAR / regional overrides | HIDDEN in wizard; **preserved** on save | existing regional rows |
| Trial policy | VISIBLE | `trialsQuery` |
| sortOrder / isHidden | MISSING here; VISIBLE on Plans panel | `CatalogManagementPanels` |
| Validation | VISIBLE | `validatePlanSave` + limit validator |
| Save / revert | VISIBLE | `saveLivePlan` / `revertUnsaved` |
| Version compare / clone / publication diff | VISIBLE stubs (“not applicable”) | `ExperiencePanels` |

Pipeline: Edit → Validate → `saveLive` (atomic) → persist → cache invalidation → runtime. Matches I-CATALOG-05 for bound Live Plan customers.
