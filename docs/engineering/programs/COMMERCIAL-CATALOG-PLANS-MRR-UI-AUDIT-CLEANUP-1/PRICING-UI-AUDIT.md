# PRICING-UI-AUDIT.md

Page: `client/src/pages/Pricing.tsx` · route `/pricing` · data `commercialCatalog.public.listOfferings`.

| Concept | Class | Notes |
|---------|-------|-------|
| Plan name | VISIBLE | Live Plan name |
| Price monthly/yearly | VISIBLE | Catalog USD (+ FX presentation) |
| Billing cycle toggle | VISIBLE | |
| Capabilities | VISIBLE | Presentation projection of bundle |
| Limits | MISSING | API includes `limits`; UI does not render |
| Trial | CONDITIONAL | Professional / current-plan highlight maps TRIAL → Professional |
| Current plan badge | VISIBLE | Entitlement hub |
| Upgrade / checkout | VISIBLE | Uses `legacyPlanId`; Owner: LOCKED (no charge) |
| Downgrade | HIDDEN | No dedicated control |
| Renewal | CONDITIONAL | Frozen banner + checkout still available |
| Simulation | VISIBLE for owner | `OwnerAccessPricingNote` |
| No-charge messaging | VISIBLE for owner | |

Public catalog is **not** entitlement authority (`assertPublicCatalogNotEntitlementAuthority`). Feature list is marketing of the published Live Plan. Server must still enforce.

**Incorrect relative to charge:** displayed catalog price may differ from Checkout `subscription_plans` amount (Professional 26.40 vs 39.00). Truthfulness gap — do not “fix” prices here.
