# GAP ANALYSIS

Classification: **A** reuse · **B** extend · **C** new POS-specific · **D** conflict · **E** future phase · **F** debt

| Area | Current State | Owner | Class | Required Change | Risk | Phase | Blocker? |
|------|---------------|-------|-------|-----------------|------|-------|----------|
| Commercial | Live Plan + hub | Catalog / Subscription Runtime | A/B | Do not fork | Low | 1 | No |
| Entitlement quantity | 3 live keys; extra keys orphaned | `checkLimit` / `LIVE_PLAN_LIMIT_KEYS` | B | Add `posTerminals` via existing limit system + seed later | Medium (fail-closed if missing) | 1 contract / apply later | No |
| Terminal | Absent | — | C | New POS Terminal aggregate | Low | 1 | No |
| Device | Screen fleet | Operational Device | A as reference, D if reused as terminal | Do not alias | High if reused | — | Only if reused |
| Cashier | User + owner access | Auth | B | Permission catalog contract; no RBAC tables in Phase 1 | Medium | 1 contract / later RBAC | No |
| Authorization | `user`\|`admin` + restaurant | `assertRestaurantAccess` | B | Layer POS access on top | Medium | 1–6 | No |
| Order | Identity PlaceOrder | Order | A | POS calls PlaceOrder | Low | later sale phase | No |
| Session | Table persistent / else ephemeral | Operational Session | A | Reference only | Low | 1 boundary | No |
| Check | Monetary AR; session optional | Check | A | Consume only | Low | later | No |
| Settlement | CheckService + SR | Check | A | Initiate only | Low | later | No |
| Register | CRMP partial | CRMP | A / E | Do not build Register | Name `mobile_pos` | later | No |
| Reporting | Channel + tender | Reporting | A / E | No POS write | Low | later | No |
| Channel | No `cashier_pos` | Ordering Channel Registry | B | Register channel as `registered` | Medium if invented ad hoc | 1 | No |
| Concurrency | Child CAS; Check header no version | Check / CRMP | E | Contract now; header OCC is Check follow-up | Medium | 1 contract | No |
| Idempotency | ADR-021 / SR | Event / Settlement | A | Reuse | Low | 1 doc | No |
| Country | Tax snapshots; no ZATCA | Restaurant / Check | A | POS country-neutral | Low | 1 | No |
| Offline | No financial offline | — | A | Keep cloud-authoritative | Low | 1 | No |
| Audit | `opsLog` (not DB) | Ops | B | Terminal events via opsLog | Low | 1 | No |
| Database | No POS table | — | C | Additive table in implementation (not this program) | Governance tail | 1 | No if not applied to Prod here |
| API | No `pos` router | — | C | New router | Low | 1 | No |
| Source arch docs | Package missing in repo | — | F | Keep approved principles; do not redesign | Doc drift | — | No |

## Architecture map (arrows)

```
BUSINESS (restaurants)                    OWNER: Tenant
  ↓ READ subscription
SUBSCRIPTION (user_subscriptions.planId)  OWNER: Subscription  WRITE: commercial programs only
  ↓ READ live plan
LIVE PLAN (commercial_plans)              OWNER: Catalog
  ↓ READ bundle + limits
COMMERCIAL PROJECTION / LIMITS            OWNER: Catalog + Runtime
  ↓ DERIVE
EFFECTIVE POS ENTITLEMENT                 OWNER: POS resolver over commercial SSOT  WRITE: none
  ↓ GATE
POS TERMINALS                             OWNER: POS  WRITE: POS  AUTHORITY: POS
  ↓ GATE
CASHIER ACCESS                            OWNER: Auth + POS policy  WRITE: none in Phase 1
  ↓
POS SURFACE                               OWNER: POS  (no money write)

POS → ORDER                               OWNER: Order  POS: WRITE via PlaceOrder only
ORDER → CHECK                             OWNER: Check  POS: none
CHECK → SETTLEMENT / TX / SR              OWNER: Check  POS: initiate later
SETTLEMENT → REGISTER/SHIFT               OWNER: CRMP attribution  POS: none
CHECK/SETTLEMENT → REPORTING              OWNER: Reporting read  POS: none
CHECK/SETTLEMENT → COUNTRY                OWNER: Compliance adapter  POS: none
```
