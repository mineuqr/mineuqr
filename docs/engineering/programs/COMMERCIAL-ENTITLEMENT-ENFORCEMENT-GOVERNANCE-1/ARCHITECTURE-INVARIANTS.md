# ARCHITECTURE-INVARIANTS.md

Platform registry: [Commercial-Entitlement-Invariants.md](../../../architecture/constitution/Commercial-Entitlement-Invariants.md).

| ID | Statement |
|----|-----------|
| I-CE-01 | Commercial capabilities have canonical identities. |
| I-CE-02 | Live Plan is the source of current commercial capability composition. |
| I-CE-03 | `getCommercialEntitlements` is the central commercial entitlement authority. |
| I-CE-04 | Commercially protected mutations MUST enforce entitlement server-side. |
| I-CE-05 | RBAC does not imply commercial entitlement. |
| I-CE-06 | UI gating is not authorization. |
| I-CE-07 | Plan-name conditionals MUST NOT replace capability checks. |
| I-CE-08 | Duplicate commercial capability matrices are prohibited. |
| I-CE-09 | Failed entitlement resolution fails closed. |
| I-CE-10 | Negative entitlement tests are mandatory. |
| I-CE-11 | Subscription expiry enters the approved FROZEN commercial state. |
| I-CE-12 | Trial expiry follows the same FROZEN commercial lifecycle. |
| I-CE-13 | FROZEN preserves customer data. |
| I-CE-14 | FROZEN preserves persistent QR identity. |
| I-CE-15 | Renewal restores the same customer commercial identity. |
| I-CE-16 | Platform Owner FULL_PLATFORM is outside customer subscription lifecycle. |
| I-CE-17 | Platform Owner SIMULATED_PLAN uses current Live Plan capabilities. |
| I-CE-18 | Commercial capability behavior must not change silently. |

I-CE-11 and I-CE-12 are implemented by **COMMERCIAL-FROZEN-ACCOUNT-STATE-1** (derived ACTIVE / FROZEN / NONE).
