# CHECK-MANAGEMENT-ARCHITECTURE-1 — Architecture

**Status:** Implemented — PRODUCTION CERTIFIED target  
**Date:** 2026-07-16  
**Type:** Operational Session Platform — Check sub-domain  

---

## 1. Objective

Introduce **Check** as a first-class monetary settlement document under the Operational Session Platform, without redesigning Order Domain, Ordering Platform, Runtime, Order Read, Business Identity, or Operational Screen Platform.

MineuQR remains a Restaurant Operations SaaS — not an ERP / accounting system.

---

## 2. Ownership

```
Operational Session Platform
  Operational Session          ← visit / occupancy / order attachment / activeCheckId
    └── Check                  ← monetary state, snapshots, settlement outcome
```

| Concept | Owner |
|---------|--------|
| Visit lifecycle / occupancy | Operational Session |
| Active Check reference | Operational Session (`activeCheckId`) |
| Monetary totals / tax breakdown / grand total | Check |
| Settlement outcome (Paid / Complimentary / Voided) | Check |
| Fulfilment FSM | Order Domain (unchanged) |
| Live tax configuration | Business Settings (`restaurants`) |
| Frozen tax/currency policy | Check snapshots |

**Check MUST have its own immutable identifier.**  
Check id is never Session id.  
Do NOT implement Split Check in this program.

Check is NOT: an Order, an Invoice, an Accounting document, or a Projection.

---

## 3. Business Settings

Owner-configured (no country hard-coding):

| Setting | Persistence |
|---------|-------------|
| Currency | `restaurants.currencyCode` / `currencySymbol` |
| Tax Enabled | `restaurants.taxEnabled` |
| Tax Mode (`inclusive` \| `exclusive`) | `restaurants.taxMode` |
| Tax Policy (versioned components[]) | `restaurants.taxPolicyJson` |

Changing Business Settings later **MUST NEVER** modify existing Checks.

---

## 4. Snapshots (immutable at Check create)

| Snapshot | Required | Notes |
|----------|----------|-------|
| Currency Snapshot | Mandatory | code + symbol |
| Tax Policy Snapshot | Mandatory | versioned document; v1 may have 0..N components (typically 0–1) |
| Service Charge Snapshot | Reserved | column nullable; implementation optional |

Tax Policy Snapshot shape (v1):

```
{
  version: 1,
  enabled: boolean,
  mode: "inclusive" | "exclusive",
  components: [{ id, name, ratePercent }]
}
```

Do not hard-code a single-rate architecture — `components[]` is the extension point for multiple rates.

---

## 5. Monetary model

Check owns:

- Subtotal (taxable base after bill-level discount)
- Tax Breakdown (`lines[]` + `totalTaxAmount`)
- Grand Total (operational amount payable)
- Settlement Outcome
- Bill-level discount amount

Line discounts remain on Orders. Session never owns discounts.

---

## 6. Outcomes

| Outcome | Meaning |
|---------|---------|
| `open` | Accepts recalculation |
| `paid` | Settled collected |
| `complimentary` | Settled comp |
| `voided` | Abandoned / closed without settle |

Avoid `cancelled` — Order already owns cancellation.

---

## 7. Freeze policy (deterministic)

Policy id: `CHECK-MANAGEMENT-ARCHITECTURE-1/freeze-v1`

1. **Snapshot freeze** — at Check create from Business Settings. Snapshots NEVER change after create.
2. **Totals while `open`** — recalculate when Session non-cancelled order money changes (or bill discount changes). Always use frozen snapshots — never live settings.
3. **Totals freeze** — on `paid` \| `complimentary` \| `voided`: one final recalculation, then `totalsFrozenAt` set. Further recalculation forbidden.
4. **Newly attached Orders** — update Session aggregates → recalculate open Check; do not re-snapshot.
5. **Legacy sessions** — `ensureOpenCheckForSession` creates Check on first touch with snapshots from *current* Business Settings at ensure-time.
6. **Split Check** — out of scope.

---

## 8. Session ↔ Check lifecycle

| Event | Check | Session |
|-------|-------|---------|
| Session created | Create Open Check; set `activeCheckId` | `open` |
| Order attached / cancelled | Recalculate if open | Aggregates update |
| Staff mark paid | Finalize `paid` + freeze | settle → closed (existing) |
| Staff mark complimentary | Finalize `complimentary` + freeze | settle → closed |
| Manual close without settle | Void open Check | `closed`, no settlementOutcome |

Session Closure remains independent of Order Completion (prior certified constraint).

---

## 9. International SaaS

| Scenario | Support |
|----------|---------|
| No tax | `taxEnabled=false` or empty components |
| Tax exclusive | `mode=exclusive` |
| Tax inclusive | `mode=inclusive` |
| Multiple rates | `components[]` length > 1 (same taxable base, sum of component taxes) |

No statutory country tax engines. No ledger / journal / AR / financial statements.

---

## 10. Non-goals

- Split Check / seat transfer  
- Tender lines / partial payments  
- Service charge calculation (slot reserved only)  
- Order Domain / Ordering Platform / Runtime / Order Read changes  
- Accounting / ERP surfaces  

---

## 11. Constraints upheld

- Settlement MUST NOT move into Order Domain  
- Order Lifecycle FSM unchanged  
- Operational Session Platform Option B / ADR-ARCH-019 upheld  
- P-09 may continue reading Session settlement fields; Check is authoritative monetary document going forward  
