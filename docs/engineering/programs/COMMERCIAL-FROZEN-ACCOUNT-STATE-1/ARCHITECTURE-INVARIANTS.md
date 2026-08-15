# ARCHITECTURE-INVARIANTS.md

Platform registry: [Commercial-Entitlement-Invariants.md](../../../architecture/constitution/Commercial-Entitlement-Invariants.md).

| ID | Statement |
|----|-----------|
| I-FROZEN-01 | Subscription or Trial expiration transitions eligible customer commercial access to FROZEN. |
| I-FROZEN-02 | FROZEN does not delete customer data. |
| I-FROZEN-03 | FROZEN does not delete persistent QR identity. |
| I-FROZEN-04 | FROZEN customer cannot perform protected commercial operations. |
| I-FROZEN-05 | FROZEN customer can authenticate for renewal. |
| I-FROZEN-06 | FROZEN customer is redirected to Plans after login. |
| I-FROZEN-07 | Direct API calls cannot bypass FROZEN. |
| I-FROZEN-08 | Direct route navigation cannot bypass FROZEN. |
| I-FROZEN-09 | FROZEN public QR resolves to the approved Frozen experience. |
| I-FROZEN-10 | Renewal restores ACTIVE state. |
| I-FROZEN-11 | Renewal restores the same account, restaurant, menu, and QR identity. |
| I-FROZEN-12 | Trial expiration follows the same Frozen lifecycle. |
| I-FROZEN-13 | Active paid subscription supersedes expired Trial. |
| I-FROZEN-14 | Platform Owner FULL_PLATFORM is outside customer Frozen lifecycle. |
| I-FROZEN-15 | Frozen state does not create a duplicate entitlement authority. |
