# COMMERCIAL-FROZEN-ACCOUNT-STATE-1

| Field | Value |
|-------|-------|
| **Type** | Implementation + Validation |
| **Date** | 2026-08-15 |
| **Prior** | COMMERCIAL-ENTITLEMENT-ENFORCEMENT-GOVERNANCE-1 |
| **Constitution** | Commercial-Entitlement-Enforcement-Constitution-v1.0 |
| **Verdict** | See [FINAL-REPORT.md](./FINAL-REPORT.md) |

No Live Plan, Owner Access, Checkout, Billing, Orders, POS, Kitchen, or Reporting redesign. No production data, migration, commit, push, or deploy.

## Canonical decision

```
ACTIVE → subscription / trial expiry → FROZEN → renewal → ACTIVE
```

FROZEN is a **derived commercial account lifecycle**, not a deleted user, disabled login, or a second entitlement resolver.

## Program deliverables

| Document | Role |
|----------|------|
| [ACCOUNT-STATE-ARCHITECTURE.md](./ACCOUNT-STATE-ARCHITECTURE.md) | Derived ACTIVE / FROZEN / NONE |
| [FROZEN-LIFECYCLE.md](./FROZEN-LIFECYCLE.md) | Product lifecycle |
| [TRIAL-EXPIRY.md](./TRIAL-EXPIRY.md) | 14-day trial authority |
| [SUBSCRIPTION-EXPIRY.md](./SUBSCRIPTION-EXPIRY.md) | Paid period end |
| [LOGIN-REDIRECT.md](./LOGIN-REDIRECT.md) | Auth remains; Plans redirect |
| [COMMERCIAL-ROUTE-GUARD.md](./COMMERCIAL-ROUTE-GUARD.md) | Centralized Dashboard guard |
| [API-ENFORCEMENT.md](./API-ENFORCEMENT.md) | Server mutation denylist |
| [PUBLIC-QR-FROZEN-BEHAVIOR.md](./PUBLIC-QR-FROZEN-BEHAVIOR.md) | QR identity + frozen page |
| [DATA-PRESERVATION.md](./DATA-PRESERVATION.md) | No destructive expiry |
| [RENEWAL-RESTORATION.md](./RENEWAL-RESTORATION.md) | Same identity returns |
| [OWNER-EXCEPTION.md](./OWNER-EXCEPTION.md) | FULL_PLATFORM / SIMULATED_PLAN |
| [MULTI-RESTAURANT-ANALYSIS.md](./MULTI-RESTAURANT-ANALYSIS.md) | Account-level scope |
| [TEST-PLAN.md](./TEST-PLAN.md) | Required matrix |
| [REGRESSION-VALIDATION.md](./REGRESSION-VALIDATION.md) | Suites + build |
| [ARCHITECTURE-INVARIANTS.md](./ARCHITECTURE-INVARIANTS.md) | I-FROZEN-01…15 |
| [FINAL-REPORT.md](./FINAL-REPORT.md) | Verdict |
