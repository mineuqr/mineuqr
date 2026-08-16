# ADMIN DOMAIN MATRIX

**Program:** COMMERCIAL-ADMIN-LIMIT-ENFORCEMENT-1  

Classification:

- **A** REQUIRED NOW — unintended Commercial bypass (fixed this program)
- **B** INTENTIONAL — explicit approved exemption
- **C** SAFE TO DEFER
- **D** ARCHITECTURE GAP (none certified)

| Resource | In a plan limit? | All tenant-scoped creates consume it? | Role changes capacity? | Class |
|----------|------------------|----------------------------------------|------------------------|-------|
| restaurants | yes | owner + admin-for-owner: yes. Onboarding first restaurant: bootstrap | no | B onboarding; else enforced |
| categories | yes | **yes after G-09** (owner and admin) | **no** | **A → fixed** |
| items | yes | **yes after G-09** | **no** | **A → fixed** |
| posTerminals | yes | POS service; no admin skip | no | already enforced |
| staff / branches / devices | feature or other limits | not quantity occupancy keys | n/a | C |
| offers / tables / holidays | not occupancy keys | n/a | n/a | C (not G-09 quantity) |
| orders | not quantity occupancy | n/a | n/a | C |

## Bypass inventory (Phase 11)

| Path | Class | Notes |
|------|-------|-------|
| Admin category/item router skip | **A** | Closed: same helper as owner |
| Admin restaurant create | already correct | Target owner cap |
| POS terminal admin | already correct | No role skip |
| Onboarding first restaurant | **B** | G-04; trial cap ≥ 1; do not wrap helper into register txn |
| `db.createCategory` residual | **C** | Live router does not call it; occupancy `create(null)` test fallback only |
| PLATFORM_OWNER FULL_PLATFORM | **B** (entitlement) | Unlimited via `checkLimit`, still through helper. Not a role bypass |

## Authorization vs Commercial

```
Authenticate → Authorize (RBAC / restaurant access)
  → Resolve tenant (restaurant.userId)
  → Commercial capacity (occupancy + checkLimit)
  → Domain lifecycle (parent FOR UPDATE)
  → Create
```

Admin role answers “may this operator mutate this restaurant?”  
It does **not** answer “does this tenant have a slot?”
