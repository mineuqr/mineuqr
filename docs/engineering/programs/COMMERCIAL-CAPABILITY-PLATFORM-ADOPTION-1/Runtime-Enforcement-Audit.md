# Runtime Enforcement Audit — COMMERCIAL-CAPABILITY-PLATFORM-ADOPTION-1

## Rule

Hidden UI alone is **not** enforcement. Commercial capabilities must be enforceable via Runtime (I-SRE-01) from Commercial Snapshot facts (I-CPL-13).

---

## Filter key enforcement depth

| Filter Key | Runtime path | Depth | Notes |
|------------|--------------|-------|-------|
| ordering | `hasFeature` / `requireFeature` / guest ordering | **full** | API + UI |
| templates / customColors / customFonts | entitlements + coarse UI locks | **coarse_legacy** | Residual depth (certified Runtime; deepen under future program) |
| All other 14 filter keys | Snapshot feature flags → `commercial.getEntitlements` → UI/API gates | **flags_only** | Present in Runtime matrix; domain hard-gates vary |

Limits (10 keys) remain I-SRE-02-mapped; hard `checkLimit` surface emphasizes restaurants/categories/items (documented Runtime residual).

---

## Surfaces checked

| Surface | Enforcement mechanism |
|---------|----------------------|
| UI / Navigation | `useCommercialFeatureVisibility` → Runtime hub (not Catalog) |
| Routes / pages | Feature visibility + server procedures |
| APIs | Subscription Runtime on commercial paths |
| Device / Screen registration | Not newly gated in this adoption (Device CAP backlog) |
| Runtime Authorization | Exclusive Runtime authority (I-SRE-01) |

Published Catalog / Pricing **never** authorize (I-CPP-01).

---

## Verdict

| Criterion | Result |
|-----------|--------|
| Every commercial filter key has Runtime matrix mapping | **PASS** (I-SRE-02) |
| Plans do not evaluate entitlements | **PASS** |
| Pricing does not enforce | **PASS** (presentation) |
| Full domain hard-gate for every flag | **PARTIAL** — see Remaining Gap Report |
