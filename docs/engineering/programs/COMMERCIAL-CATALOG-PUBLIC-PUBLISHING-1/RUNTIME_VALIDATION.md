# RUNTIME_VALIDATION.md — COMMERCIAL-CATALOG-PUBLIC-PUBLISHING-1

## Suite

`server/commercial-catalog/__tests__/commercialCatalogPublicPublishing.test.ts`

**Result: 9/9 passed** (2026-07-30)

---

## Confirmations

| Requirement | Evidence |
|-------------|---------|
| Published plans publicly discoverable | `keeps drafts private and publishes for public browse` — list length 1 after publish |
| Draft plans remain private | Same test — get/list empty before publish; approved still private |
| Deprecated historically addressable | `exposes deprecated historically…` — get OK; list empty; `openForNewAdoption=false` |
| Retired cannot be newly adopted | Retired get → inaccessible; not in browse |
| Archived inaccessible | Archive after retire → get throws; workflow `archived` |
| Subscription Runtime isolated | Source guards: no `subscription-runtime` imports; no `hasFeature` / `checkEntitlement`; status marker asserts non-participation |
| Lifecycle guards | Schedule requires Approved; workflow publish requires Approved/Scheduled |
| Public API wiring | Router file contains `listOfferings`; parent mounts `public` + `publishing` |
| Selection remains published-only | `PLAN_SELECTION_VISIBLE_STATES === ["published"]` |

---

## Invariant checks (program)

| Invariant | Status |
|-----------|--------|
| Snapshot Identity / Commercial Snapshot Invariant | Preserved — publishing does not write bindings/snapshots for entitlement |
| I-CPL-13 | Preserved — no Snapshot mutation path in publishing module |
| I-SRE-01 | Preserved — Runtime remains entitlement authority |
| I-SRE-02 | Untouched (out of scope) |
| Published Catalog ↛ entitlement | Certified by isolation tests + architecture marker |
| Runtime ↛ mutable Catalog for enforcement | No new path introduced |

---

## How to re-run

```bash
npx vitest run server/commercial-catalog/__tests__/commercialCatalogPublicPublishing.test.ts
```
