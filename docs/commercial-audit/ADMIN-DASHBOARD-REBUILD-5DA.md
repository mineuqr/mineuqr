# REBUILD-5DA — Customer Success Domain Registry

**Program:** ADMIN-DASHBOARD-REBUILD-5D  
**Phase:** 5DA — Customer Success Domain Registry  
**Mode:** Structural extraction (ownership only)

---

## Created: `client/src/lib/admin/domains/customer-success/`

| File | Responsibility |
|------|----------------|
| `customerSuccessTypes.ts` | `CustomerSuccessAssetId`, categories, `SecurityHostedAssetId` boundary types |
| `customerSuccessDomain.ts` | `CUSTOMER_SUCCESS_DOMAIN_ID`, 20 asset definitions, `SECURITY_HOSTED_IN_ACCOUNTS` |
| `customerSuccessRegistry.ts` | `getCustomerSuccessAsset`, `getCustomerSuccessAssetsBySurface` |
| `index.ts` | Barrel exports |

---

## Domain Identity

```ts
CUSTOMER_SUCCESS_DOMAIN_ID = "customer-success"
```

---

## Asset Categories

| Category | Assets |
|----------|--------|
| `accounts` | Accounts workspace |
| `tenants` | Tenants workspace |
| `communications` | Communications workspace |
| `health` | Subscription health, customer health indicators |
| `attention` | Needs-attention workflow |
| `lifecycle` | Subscription CRUD in accounts workspace |
| `trial` | Trial status display in accounts |
| `subscription` | (via lifecycle APIs) |
| `api` | 11 Customer Success procedures |
| `helper` | `ownerCommercialDisplay`, `CommercialReadService` |

---

## Security Boundary Registry

Security-owned controls **physically hosted** in accounts workspace are documented separately — not CS-owned:

```ts
SECURITY_HOSTED_IN_ACCOUNTS = [
  "security-role-edit",
  "security-classification-edit",
  "security-create-internal-user",
  "security-delete-user",
  "security-platform-account-guards",
]
```

Owner remains **Security Domain** (REBUILD-5B).

---

## Composition Sections

```ts
CUSTOMER_SUCCESS_COMPOSITION_SECTIONS = [
  "CustomerSuccessAccountsSection",
  "CustomerSuccessTenantsSection",
  "CustomerSuccessCommunicationsSection",
  "CustomerSuccessHealthSection",
  "CustomerSuccessAttentionSection",
  "CustomerSuccessCommercialSections",
]
```

No UI changes in this phase — registry metadata only.
