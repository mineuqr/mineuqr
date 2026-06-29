# Architecture Risk Register

**Program:** ORDERS-WORKSPACE-1  
**Type:** Architecture Investigation (read-only)  
**Date:** 2026-06-26

---

## Risk Rating Scale

| Probability | Impact |
|-------------|--------|
| **High** — likely in production | **Critical** — data integrity / SSOT breach |
| **Medium** — plausible at scale | **High** — operator failure / major rework |
| **Low** — edge case | **Medium** — degraded experience |
| | **Low** — minor inconvenience |

---

## Risks

### RISK-01 — Client KPI Divergence from Server Truth

| Field | Value |
|-------|-------|
| **Probability** | High |
| **Impact** | Critical |
| **Description** | `buildOrderStatistics` computes revenue and counts client-side. Timezone edge cases, status timing, or partial cache can produce KPIs that disagree with server records. |
| **Evidence** | `buildOrderStatistics` uses `todayYmd()` + `convertUtcToRestaurantTime`; `ADR-ARCH-002` SSOT requirement |
| **Architectural Consequence** | Owner makes operational decisions on non-authoritative metrics; audit trail mismatch |
| **Recommendation** | Implement server read model per ADR-ARCH-009 before workspace certification; remove client KPI functions |

---

### RISK-02 — Full Order List Scan at Scale

| Field | Value |
|-------|-------|
| **Probability** | Medium |
| **Impact** | High |
| **Description** | `order.list` returns all restaurant orders; UI polls every 10s from multiple tabs. No pagination or active-only filter used. |
| **Evidence** | `getOrdersWithItemsByRestaurant`; INV-09, INV-10 H-01 |
| **Architectural Consequence** | DB and network load grows linearly; UI render degrades; tablet ops become unusable |
| **Recommendation** | Active orders read model with server-side filter; pagination or cursor |

---

### RISK-03 — Monolithic Dashboard Regression

| Field | Value |
|-------|-------|
| **Probability** | High |
| **Impact** | High |
| **Description** | Any Orders Workspace change touches `Dashboard.tsx` shared with menu, settings, reports. |
| **Evidence** | 4,481-line file; INV-03 coupling analysis |
| **Architectural Consequence** | Implementation program causes unrelated feature regressions |
| **Recommendation** | Extract Orders Workspace module with explicit boundaries before feature work |

---

### RISK-04 — Inconsistent Pending Counts Across Tabs

| Field | Value |
|-------|-------|
| **Probability** | Medium |
| **Impact** | Medium |
| **Description** | Home uses ops overview + client stats; Orders tab uses raw list; definitions differ (pending vs pending+preparing). |
| **Evidence** | GAP-05; `OperationalSnapshotSection` lines 980–982 |
| **Architectural Consequence** | Operator distrust of dashboard |
| **Recommendation** | Single server projection for all operational counts |

---

### RISK-05 — Stale Order List Between Polls

| Field | Value |
|-------|-------|
| **Probability** | Medium |
| **Impact** | Medium |
| **Description** | Without mutation, up to 10s stale data. Multi-operator scenarios may show outdated status. |
| **Evidence** | `DASHBOARD_ORDER_LIST_POLL_MS = 10_000`; no WebSocket |
| **Architectural Consequence** | Duplicate status actions; operator confusion |
| **Recommendation** | Mutation cache invalidation already partial; consider subscription or shorter poll for active orders |

---

### RISK-06 — Cancel Capability Gap

| Field | Value |
|-------|-------|
| **Probability** | Medium |
| **Impact** | Medium |
| **Description** | Operators cannot cancel preparing/ready orders from UI though domain supports it. |
| **Evidence** | LC-01; `OrderLifecyclePolicy` vs `OrdersTab` buttons |
| **Architectural Consequence** | Workaround requests; direct DB intervention risk |
| **Recommendation** | Align UI actions with domain policy during workspace implementation |

---

### RISK-07 — Synchronous Consumer Latency on Mutations

| Field | Value |
|-------|-------|
| **Probability** | Low |
| **Impact** | Medium |
| **Description** | `runOrderCommand` awaits relay + in-process consumers before returning. Push/notification failures could slow mutations. |
| **Evidence** | `mapOrderDomainError.ts` lines 33–35; INV-07 synchronous dependencies |
| **Architectural Consequence** | Owner status update feels slow; timeout risk under load |
| **Recommendation** | Monitor consumer latency; consider async dispatch post-certification (out of scope for investigation) |

---

### RISK-08 — Session-Order Data Mismatch in Sheet

| Field | Value |
|-------|-------|
| **Probability** | Low |
| **Impact** | Medium |
| **Description** | Session sheet combines `session.getOwnerWorkspace` and separate `order.list` with client `countSessionItems`. |
| **Evidence** | `DiningSessionWorkspaceSheet.tsx` lines 83–102 |
| **Architectural Consequence** | Incorrect item counts or totals displayed |
| **Recommendation** | Single workspace projection from server |

---

### RISK-09 — Implementation Without Read Models Replicates Debt

| Field | Value |
|-------|-------|
| **Probability** | High |
| **Impact** | Critical |
| **Description** | Building new workspace features on `order.list` + client derivations encodes current violations deeper. |
| **Evidence** | ORDER-1 CV-05 deferred to ORDERS-WORKSPACE-1; ADR-Registry "Not implemented" |
| **Architectural Consequence** | Expensive rework; certification failure |
| **Recommendation** | Block implementation on ADR-ARCH-006/009 resolution plan |

---

### RISK-10 — Email Verification Gate Partial Coverage

| Field | Value |
|-------|-------|
| **Probability** | Low |
| **Impact** | Low |
| **Description** | `VerificationRequiredPanel` blocks Orders tab on verification error; alert system still polls notifications. |
| **Evidence** | `OrdersTab` line 3906; `OrderAlertSystem` uses separate `notification.getUnread` |
| **Architectural Consequence** | Minor inconsistent gating |
| **Recommendation** | Document expected behavior; align gates if required |

---

## Risk Heat Map

| | Critical Impact | High Impact | Medium Impact | Low Impact |
|---|----------------|-------------|---------------|------------|
| **High Prob** | RISK-01, RISK-09 | RISK-03 | — | — |
| **Med Prob** | — | RISK-02 | RISK-04, RISK-05, RISK-06, RISK-07, RISK-08 | — |
| **Low Prob** | — | — | — | RISK-10 |

---

## Top 5 Risks for Architecture Authority Review

1. **RISK-01** — Client KPI divergence (Critical)
2. **RISK-09** — Implementation without read models (Critical)
3. **RISK-02** — Full list scan at scale (High)
4. **RISK-03** — Monolithic dashboard regression (High)
5. **RISK-04** — Inconsistent pending counts (Medium)
