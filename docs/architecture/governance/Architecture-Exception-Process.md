# Architecture Exception Process

> **Constitution §28.4** · [Compliance](../constitution/Compliance.md)

## When to use

Emergencies only — production incidents requiring temporary deviation from the Constitution.

## Process

1. Document exception: scope, duration, approver, mitigation plan
2. Maximum duration: **30 days** unless extended by Architecture Authority
3. Follow-up required: ADR or revert — exceptions cannot become permanent
4. Emergency ADR within **5 business days**

## Required fields

| Field | Description |
|---|---|
| Exception ID | EXC-YYYY-NNN |
| Program | Affected implementation program |
| Constitutional rule | § or ADR violated |
| Justification | Why exception is necessary |
| Expiry date | ≤ 30 days from approval |
| Remediation | ADR number or revert PR |

## Forbidden

- Permanent exceptions without ADR amendment
- Exceptions for convenience (deadline pressure alone)
- Skipping exit review via rolling exceptions

---

**Related:** [ADR Lifecycle](./ADR-Lifecycle.md)
