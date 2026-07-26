# REFUND-OPERATIONAL-WORKFLOW-ADOPTION-2 — Policy Adoption Report

| Field | Value |
|---|---|
| **Program** | REFUND-OPERATIONAL-WORKFLOW-ADOPTION-2 |
| **Date** | 2026-07-26 |
| **Verdict** | **PRODUCTION CERTIFIED** |

---

## Business Financial Refund Policy

Document: `shared/operational-session/check/businessRefundPolicy.ts`

| Flag | Default | Behavior |
|------|---------|----------|
| `refundEnabled` | `true` | When false → `REFUND_POLICY_DISABLED` |
| `windowHours` | `24` | Age vs `settledAt`/`createdAt`; expired → `REFUND_WINDOW_EXPIRED` |
| `partialRefundAllowed` | `true` | When false, apply rejects amount &lt; refundable balance |
| `requireReason` | `false` | When true, empty reason rejected |
| `requireManagerApproval` | `false` | When true, require `managerApproved === true` |
| `version` | `1` | Future expansion without redesign |

Parse/serialize JSON supports future restaurant persistence (`refundPolicyJson` optional cast). Absent column / null → defaults (no migration in this program).

---

## Enforcement points

| Point | Function |
|-------|----------|
| Lookup eligibility | `lookupCheckRefundBySettlementNumber` sets `rejectionCode` + `eligible` |
| Apply gate | `assertRefundPolicyAllowsApply` before `applyRefundOnCheck` |
| UX | Expired window: message (Settlement Date, Allowed Window, Elapsed) + hide Save |

---

## Tests

- Default 24h + parse/serialize round-trip
- Expired after 24h / allowed inside window (`businessRefundPolicy.test.ts`)

---

## Final Certification

**PRODUCTION CERTIFIED**
