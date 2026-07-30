# Commercial Projection Design

**Program:** CAPABILITY-DISCOVERY-PLATFORM-RECONSTRUCTION-1  
**Mode:** **Design only** — do not implement Commercial Registry, Plans, Catalog, or Runtime changes.

---

## 1. Target law

```
Discovery (Canonical Registry)
        ↓
Commercial Projection Engine  (future)
        ↓
Commercial Registry (generated filter vocabulary)
        ↓
Plans (Capability Filters over projected keys)
        ↓
Published Offerings
        ↓
Runtime Enforcement (Snapshot entitlements)
```

Commercial Registry **MUST become a projection**, not an independently maintained FEATURE_KEYS list.

---

## 2. Projection inputs

| Input | Role |
|-------|------|
| Canonical Discovery Registry | What exists |
| Commercial Eligibility class | What may be sold |
| Packaging policy (AA) | Composition / bundling rules |
| Quota dimensions | Limit keys (separate axis) |
| Enforcement readiness overlay | Optional: require `runtimeEnforced=full` before Plan toggle GA |

---

## 3. Projection outputs (conceptual)

| Output | Description |
|--------|-------------|
| `projectedFilterKeys[]` | Stable Plan toggle identifiers |
| `discoveryCapId` linkage | 1:1 or 1:N packaging map |
| `runtimeCapabilityId` | Matrix `cap.*` IDs for Snapshot |
| `class` | Always derived commercializable for projected keys |
| `ownerDomain` | Copied from Discovery owner |

**No hand-edited parallel list.** Diff = regenerate from Discovery + policy.

---

## 4. Mapping strategies (choose in future AA program)

| Strategy | Description | When |
|----------|-------------|------|
| **1:1 Direct** | One ELIGIBLE CAP → one filter key | Kitchen, Printing, Waiter, Kiosk, Expo, Reporting |
| **Bundle** | CAP-16+17 → `register` | Register platform sold as unit |
| **Channel pack** | CAP-03+32+31 options | Ordering SKUs |
| **Settlement pack** | CAP-08+10+11+13 options | Settlement SKUs |
| **Exclude** | CAP-01/02/07/… | Internal planes never projected |

Legacy FEATURE_KEYS **are not** projection inputs. They are compatibility aliases during a transition window only (optional).

---

## 5. Illustrative projection sketch (non-normative)

| Projected key (example) | Discovery source | Notes |
|-------------------------|------------------|-------|
| `ordering` | CAP-03 | Retain key for Runtime continuity *or* rename with migration program |
| `kiosk` | CAP-32 | New |
| `waiter` | CAP-31 | Replaces weak `callWaiter` |
| `kitchen` | CAP-26 | New |
| `expo` | CAP-47 | New |
| `printing` | CAP-27 | New |
| `register` | CAP-16+17 | Bundle |
| `devices` | CAP-29 (+ CAP-30) | Feature toggle distinct from limit `devices` |
| `realtime` | CAP-28 | New |
| `reporting` | CAP-22 | Replaces `reports`+`excelExport` merge |
| `splitPayment` | CAP-10 | New |
| `refund` | CAP-13 | New |
| `counterPickup` | CAP-33 | New |

**Not projected:** CAP-05 atomic facets (`categories`, `search`, …), `hotelMode`, `cart`, `checkout`.

---

## 6. Runtime enforcement path (future)

1. Projection emits filter key → `runtimeCapabilityId`  
2. Catalog Plan versions reference **only** projected keys  
3. Snapshot bind freezes entitlements  
4. Domains call `requireFeature` / `hasFeature` for projected keys (adoption programs)  
5. Published Catalog remains browse-only (I-CPP-01)  

This program does **not** implement steps 1–5.

---

## 7. Transition from FEATURE_KEYS (design)

| Phase | Action |
|-------|--------|
| T0 | Discovery SSOT ratified (this package) |
| T1 | Implement Projection Engine + generated Commercial Registry |
| T2 | Dual-publish: legacy keys aliased to projected keys |
| T3 | Domain enforcement adoption for new keys |
| T4 | Retire deprecated FEATURE_KEYS |

No phase executes in this program.

---

## 8. Invariants for future implementation

1. Projection **cannot** invent capabilities absent from Discovery.  
2. Projection **cannot** mark NOT READY as GA sellable without AA waiver.  
3. Catalog / Runtime must consume projection output, not edit Discovery.  
4. I-SRE-01/02 remain: Runtime exclusive entitlement authority; matrix completeness vs **projected** vocabulary.  
5. I-CPP-01 remains: Published Catalog never authz input.
