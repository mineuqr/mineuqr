# Commercial Entitlement Invariants (I-CE-*)

| Field | Value |
|-------|-------|
| **Status** | Normative (Pending Review with constitution) |
| **Owner** | Architecture Authority |
| **Scope** | Commercial entitlement · Live Plans · Owner Access · customer subscription lifecycle |
| **Prefix** | `I-CE-*` |
| **Constitution** | [Commercial Entitlement Enforcement Constitution v1.0](./Commercial-Entitlement-Enforcement-Constitution-v1.0.md) |
| **Program** | COMMERCIAL-ENTITLEMENT-ENFORCEMENT-GOVERNANCE-1 |

This is the **platform invariant registry** for Commercial Entitlement. Ordering invariants remain `OI-*`. Financial invariants remain under their ADRs.

| ID | Statement | Status |
|----|-----------|--------|
| **I-CE-01** | Commercial capabilities have canonical identities. | In force (governance) |
| **I-CE-02** | Live Plan is the source of current commercial capability composition. | In force (governance) |
| **I-CE-03** | `getCommercialEntitlements` is the central commercial entitlement authority. | In force (runtime + governance) |
| **I-CE-04** | Commercially protected mutations MUST enforce entitlement server-side. | In force (runtime for `devices`; governance for all future capabilities) |
| **I-CE-05** | RBAC does not imply commercial entitlement. | In force (governance) |
| **I-CE-06** | UI gating is not authorization. | In force (governance) |
| **I-CE-07** | Plan-name conditionals MUST NOT replace capability checks. | In force (governance) |
| **I-CE-08** | Duplicate commercial capability matrices are prohibited. | In force (governance) |
| **I-CE-09** | Failed entitlement resolution fails closed. | In force (runtime + governance) |
| **I-CE-10** | Negative entitlement tests are mandatory. | In force (governance) |
| **I-CE-11** | Subscription expiry enters the approved FROZEN commercial state. | In force (runtime — COMMERCIAL-FROZEN-ACCOUNT-STATE-1) |
| **I-CE-12** | Trial expiry follows the same FROZEN commercial lifecycle. | In force (runtime — COMMERCIAL-FROZEN-ACCOUNT-STATE-1) |
| **I-CE-13** | FROZEN preserves customer data. | In force (governance; no deletion on expiry) |
| **I-CE-14** | FROZEN preserves persistent QR identity. | In force (governance; no QR regen on expiry) |
| **I-CE-15** | Renewal restores the same customer commercial identity. | In force (governance) |
| **I-CE-16** | Platform Owner FULL_PLATFORM is outside customer subscription lifecycle. | In force (runtime + governance) |
| **I-CE-17** | Platform Owner SIMULATED_PLAN uses current Live Plan capabilities. | In force (runtime + governance) |
| **I-CE-18** | Commercial capability behavior must not change silently. | In force (governance) |

### Runtime vs follow-on

**COMMERCIAL-FROZEN-ACCOUNT-STATE-1** derives commercial account state (`ACTIVE` / `FROZEN` / `NONE`) from the existing entitlement hub. Expired / cancelled / suspended customer entitlements still resolve capabilities to plan `NONE` (fail closed). That entitlement result is not a second account-state system. Product FROZEN UX (login → Plans, route guard, API denylist, public QR frozen experience) is implemented in that program.

### Frozen account invariants (I-FROZEN-*)

| ID | Statement | Status |
|----|-----------|--------|
| **I-FROZEN-01** | Subscription or Trial expiration transitions eligible customer commercial access to FROZEN. | In force (runtime) |
| **I-FROZEN-02** | FROZEN does not delete customer data. | In force |
| **I-FROZEN-03** | FROZEN does not delete persistent QR identity. | In force |
| **I-FROZEN-04** | FROZEN customer cannot perform protected commercial operations. | In force (runtime) |
| **I-FROZEN-05** | FROZEN customer can authenticate for renewal. | In force |
| **I-FROZEN-06** | FROZEN customer is redirected to Plans after login. | In force (runtime) |
| **I-FROZEN-07** | Direct API calls cannot bypass FROZEN. | In force (runtime) |
| **I-FROZEN-08** | Direct route navigation cannot bypass FROZEN. | In force (runtime) |
| **I-FROZEN-09** | FROZEN public QR resolves to the approved Frozen experience. | In force (runtime) |
| **I-FROZEN-10** | Renewal restores ACTIVE state. | In force (derived) |
| **I-FROZEN-11** | Renewal restores the same account, restaurant, menu, and QR identity. | In force (no destructive expiry) |
| **I-FROZEN-12** | Trial expiration follows the same Frozen lifecycle. | In force (runtime) |
| **I-FROZEN-13** | Active paid subscription supersedes expired Trial. | In force (canonical pick + hub) |
| **I-FROZEN-14** | Platform Owner FULL_PLATFORM is outside customer Frozen lifecycle. | In force (runtime) |
| **I-FROZEN-15** | Frozen state does not create a duplicate entitlement authority. | In force |
