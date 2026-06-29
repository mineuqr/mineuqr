# Architecture Risk Register

**Program:** ORDERS-READ-MODEL-1  
**Type:** Architecture Investigation (read-only)  
**Date:** 2026-06-26

---

## RR-01 — SSOT Breach via Client Analytics

| Field | Value |
|-------|-------|
| **Probability** | High |
| **Impact** | Critical |
| **Description** | Owners act on client-computed revenue and order counts that may diverge from server records. |
| **Architectural consequence** | Audit failure, incorrect business decisions, certification rejection |
| **Mitigation recommendation** | Implement server order analytics read API per ADR-ARCH-009; remove client KPI functions |

---

## RR-02 — Order List Poll Collapse at Volume

| Field | Value |
|-------|-------|
| **Probability** | Medium |
| **Impact** | High |
| **Description** | Full `order.list` with N+1 items every 10s exceeds practical limits as history grows. |
| **Architectural consequence** | Dashboard unusable; DB load spikes; support incidents |
| **Mitigation recommendation** | Active-orders read model with pagination; eliminate N+1 |

---

## RR-03 — Downstream Programs Build on Legacy Reads

| Field | Value |
|-------|-------|
| **Probability** | High |
| **Impact** | Critical |
| **Description** | ORDERS-WORKSPACE-1, KITCHEN-DISPLAY-1, PRINTING-1 implemented atop `order.list` would encode debt permanently. |
| **Architectural consequence** | Expensive rework; multi-program certification failure |
| **Mitigation recommendation** | Gate all read-dependent programs on ORDERS-READ-MODEL-1 completion |

---

## RR-04 — Kitchen/Print Programs Start Without Read Models

| Field | Value |
|-------|-------|
| **Probability** | Medium |
| **Impact** | High |
| **Description** | Teams may poll `order.list` for KDS or reuse notification path for print status. |
| **Architectural consequence** | ADR-ARCH-012 violation; wrong coupling to owner dashboard query |
| **Mitigation recommendation** | Mandate dedicated queue projections before UI programs |

---

## RR-05 — Metric Definition Drift

| Field | Value |
|-------|-------|
| **Probability** | Medium |
| **Impact** | Medium |
| **Description** | Three definitions of "pending" across ops, client stats, and board. |
| **Architectural consequence** | Operator confusion; trust erosion |
| **Mitigation recommendation** | Canonical metric glossary + single server source per metric |

---

## RR-06 — Dual Fetch Session Sheet

| Field | Value |
|-------|-------|
| **Probability** | Low |
| **Impact** | Medium |
| **Description** | Session workspace + full order list may show inconsistent item counts. |
| **Architectural consequence** | Support tickets; settlement disputes |
| **Mitigation recommendation** | Single workspace projection DTO; remove redundant `order.list` in sheet |

---

## RR-07 — Activity Feed Incomplete Order History

| Field | Value |
|-------|-------|
| **Probability** | Medium |
| **Impact** | Low |
| **Description** | Feed shows only latest status change per order (`activityFeed.ts` lines 17–18). |
| **Architectural consequence** | Operators miss intermediate transitions in feed view |
| **Mitigation recommendation** | Document as known limitation or project from `OrderStatusChanged` events (future) |

---

## RR-08 — Legacy db.ts Write Functions Coexist

| Field | Value |
|-------|-------|
| **Probability** | Low |
| **Impact** | Medium |
| **Description** | `updateOrderStatus` in `db.ts` remains for repository fallback paths. |
| **Architectural consequence** | Potential bypass of aggregate lifecycle on failure paths |
| **Mitigation recommendation** | Track as write-side debt; ensure read model program does not expand `db.ts` |

---

## RR-09 — No Read Model Versioning

| Field | Value |
|-------|-------|
| **Probability** | Medium |
| **Impact** | Medium |
| **Description** | Ops projections have `generatedAt` but no schema/version contract for order reads. |
| **Architectural consequence** | Breaking UI changes during read model rollout |
| **Mitigation recommendation** | ADR for read model versioning before implementation |

---

## RR-10 — Polling Masking Missing Projections

| Field | Value |
|-------|-------|
| **Probability** | High |
| **Impact** | Medium |
| **Description** | 10s polling "works" at current scale, delaying read model investment. |
| **Architectural consequence** | Sudden production failure when order volume crosses threshold |
| **Mitigation recommendation** | Define scale thresholds in program charter; monitor payload size |

---

## Top Risks for Architecture Authority

1. **RR-01** — Client analytics SSOT breach
2. **RR-03** — Downstream programs on legacy reads
3. **RR-02** — Poll collapse at volume
4. **RR-04** — Kitchen/print without read models
