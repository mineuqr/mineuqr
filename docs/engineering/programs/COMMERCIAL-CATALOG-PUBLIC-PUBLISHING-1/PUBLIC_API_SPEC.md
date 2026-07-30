# PUBLIC_API_SPEC.md — COMMERCIAL-CATALOG-PUBLIC-PUBLISHING-1

Base router: `commercialCatalog`

---

## Public surface (`commercialCatalog.public.*`)

Unauthenticated (`publicProcedure`). Exposes **published** commercial offerings only.

| Procedure | Type | Input | Behavior |
|-----------|------|-------|----------|
| `public.status` | query | — | Program id + entitlement isolation marker |
| `public.listOfferings` | query | — | All publicly browsable offerings (`workflowState=published`, non-hidden plans) |
| `public.getOffering` | query | `{ planVersionId }` | Published **or** historically deprecated; else `NOT_FOUND` |
| `public.getVersionVisibility` | query | `{ planVersionId }` | Public version metadata + visibility flags; draft internals never returned |

### Visibility rules

| Workflow | `listOfferings` | `getOffering` | New adoption |
|----------|-----------------|---------------|--------------|
| draft / approved / scheduled | excluded | NOT_FOUND | no |
| published | included | OK | yes |
| deprecated | excluded | OK (historical) | no |
| retired | excluded | NOT_FOUND | no |
| archived | excluded | NOT_FOUND | no |

### Offering DTO (`PublicCatalogOffering`)

- `schemaVersion`, plan/version identity, `workflowState`, `visibility`
- Canonical currency amounts (`priceMonthly` / `priceYearly`), `featureKeys`, `limits`
- `trialDurationDays`, optional `legacyPlanId`, `publishedAt`
- **Never** includes draft revision fields, internal review notes, or entitlement decisions

---

## Admin publishing workflow (`commercialCatalog.publishing.*`)

Admin-gated (`assertAdminAccess`).

| Procedure | Purpose |
|-----------|---------|
| `publishing.getStatus` / `listStatuses` | Foundation + workflow + visibility |
| `publishing.approveVersion` | Draft → Approved (overlay) |
| `publishing.schedulePublish` | Approved → Scheduled (`effectiveAt` future ISO) |
| `publishing.cancelSchedule` | Clear schedule; remain Approved |
| `publishing.publishVersion` | **Workflow-enforced** publish (Approved or Scheduled required) |
| `publishing.applyDueSchedules` | Publish due Scheduled versions |
| `publishing.deprecateVersion` / `retireVersion` | Foundation transitions via CatalogPublishingService |
| `publishing.archiveVersion` | Retired → Archived (overlay) |
| `publishing.cacheStats` | Cache diagnostics (not SSOT) |

---

## Compat (existing admin)

| Procedure | Notes |
|-----------|-------|
| `publishVersion` | Still allows direct draft→published (`enforceWorkflow: false`); routes through CatalogPublishingService (clears overlay + cache) |
| `deprecateVersion` / `retireVersion` | Routed through CatalogPublishingService |
| `listPublishedOfferings` | Remains admin-only adoption projection |
| `validatePublication` | Unchanged CC-16 |

---

## Isolation

Public and publishing routers **must not** call Subscription Runtime entitlement APIs. Consumers of public offerings use Catalog for discovery only; activation/entitlement remains Runtime + Snapshot path.
