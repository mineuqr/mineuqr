# Compatibility

**Program:** COMMERCIAL-CATALOG-PLATFORM-ARCHITECTURE-1  
**Status:** Architecture only  
**Date:** 2026-07-29

---

## 1. Subscription Platform

| Catalog provides | Subscription owns |
|------------------|-------------------|
| Plan Identity / Versions / prices / bundles / limits / trial templates / migration policies / **compatibility matrix** / **regional policies** / snapshot schema | Subscription instances, entitlement evaluation, customer trial state, **Commercial Snapshot persistence (CC-13)**, dual-gate with RBAC |

**Refinement:** Subscription Architecture’s “Plan Catalog” ownership is **consumed from Commercial Catalog** going forward. Entitlement SSOT remains Subscription.

Subscriptions **must** store `planVersionId` (**CC-03**) and an immutable **Commercial Snapshot** at activation (**CC-13**).

Migrations must respect **CC-14** allow-lists and create a new Snapshot.

---

## 2. Tenant Identity

Subscriptions attach to Canonical Tenant ID. Catalog never mints identity. Catalog never reparents tenants. Regional offer eligibility may use Tenant country metadata as input — Catalog still owns regional policies (**CC-15**).

---

## 3. RBAC

| Permission examples (future catalog) | Purpose |
|--------------------------------------|---------|
| `commercial_catalog.read` | View offerings |
| `commercial_catalog.manage` | Draft versions |
| `commercial_catalog.admin` | Publish (CC-16 gate) / retire / migration + compatibility policy |
| `subscription.manage` | Bind/migrate customer subscriptions (Subscription tools) |

Catalog publish ≠ Subscription migrate — separate permissions.

---

## 4. Billing providers (future)

| Must | Must not |
|------|----------|
| Read Version prices, cycles, regional/tax-policy refs | Own Plan Identity or regional commercial policies (**CC-15**) |
| Record promotion ids on charges | Mutate Catalog or Snapshots |
| Swap providers without Catalog redesign | Invent SKUs |

---

## 5. Domains / AI / Reporting

- Domains: Feature entitlements only (**SP-19**) — prefer Snapshot feature set for historical jobs  
- AI: Feature keys + limits from Snapshot / bound Version via Subscription  
- Reporting: commercial **Snapshots** — never live-mutate history (**CC-11**, **CC-13**)  
