# REFUND-REGISTER-ADOPTION-1 — Register Adoption Report

| Field | Value |
|---|---|
| **Program** | REFUND-REGISTER-ADOPTION-1 |
| **Date** | 2026-07-26 |
| **Verdict** | **PRODUCTION CERTIFIED** |

---

## 1. Register responsibilities preserved

| Owns | Status |
|------|--------|
| Cash Custody | **Yes** — signed cash tender on refund attribution |
| Financial Attribution | **Yes** — refund SR → Register + Shift + Operator |
| Shift Balancing | **Yes** — Expected Cash formula unchanged (`+=` signed) |
| Drawer Movement | Via attribution custody fact (no invented paid_out) |
| Operator Accountability | Operator id from Settlement Context |
| Operational Audit | Reuses `SettlementAttributed` by SR id |

| Forbidden | Status |
|-----------|--------|
| Execute Refund | **Not owned** — Check Aggregate only |
| Revenue / Net Revenue | **Not computed** |
| Mutate Settlement Records | **Not done** |
| Invent money without SR | **Not done** |

---

## 2. Refund adoption behavior

| Action | Behavior |
|--------|----------|
| Recognize refund SR | `recordKind === "refund"` eligibility |
| Attribute to Register | From resolved Settlement Context |
| Attribute to Shift | Open Financial Shift id |
| Chronological audit | Append-only attribution list on Shift |
| Never execute Refund | Post-commit only after Check TX |

---

## 3. Drawer adoption

| Tender | Custody fact |
|--------|----------------|
| Cash refund | Negative `cashTenderAmount` (Expected Cash ↓) |
| Card / network refund | `0.00` (association only) |
| Mixed | Cash portion negated only |

---

## 4. Final Certification

**PRODUCTION CERTIFIED**
