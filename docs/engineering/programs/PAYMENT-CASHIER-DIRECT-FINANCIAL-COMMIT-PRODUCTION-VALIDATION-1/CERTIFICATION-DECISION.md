# CERTIFICATION-DECISION

| Field | Value |
|---|---|
| **Program** | PAYMENT-CASHIER-DIRECT-FINANCIAL-COMMIT-PRODUCTION-VALIDATION-1 |
| **Date** | 2026-08-19 |
| **Decision** | **CERTIFIED WITH CONDITIONS** |
| **Production Certified** | **No** |
| **ADR-038** | Unchanged. Registry remains Partial until a later program collects live Confirm samples. |

---

## Decision

Cashier Direct Financial Commit **remains CERTIFIED WITH CONDITIONS**.

G1 proves production is serving the intended client+server baseline (`29db3a10`), including the preview/Confirm split (`showCardOverTender` in the live bundle).

G16 cannot upgrade to PRODUCTION CERTIFIED: no production Order was confirmed, so Check-absent Confirm, atomic PAID+ST+OS+SR, print-after-SR, duplicate/retry, session/kiosk isolation, preview paint, observability, and tenant isolation are unproven in production.

---

## Conditions to lift

A follow-up **authorized production Cashier session** on an intended test restaurant must collect:

1. Pre-Confirm: `orderId` present, `checkId` null (G2)
2. Cash = due: truthful paid/remaining, no card error, Confirm enabled only after `saleReady` (G3, G12)
3. One Confirm → one Check PAID + ST + OS + SR; print after SR (G4–G6)
4. T0–T15 clocks where instrumentation exists; UNKNOWN otherwise (G7)
5. Double-click / retry → one financial outcome (G8)
6. Session/kiosk Check path unchanged (G11)
7. Confirm success while realtime is degraded or expired (G13)
8. Ops logs without secrets; tenant-scoped rows only (G14–G15)

G9/G10 remain optional unless a safe harness exists.

---

## Explicit non-claims

- Not Production Certified
- Not a financial-commit performance certification
- Not a realtime-ticket certification
- Not an ADR-038 change
- Browser totals are not financial authority
