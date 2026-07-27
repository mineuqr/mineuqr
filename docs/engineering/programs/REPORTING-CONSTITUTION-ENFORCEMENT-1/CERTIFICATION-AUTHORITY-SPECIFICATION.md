# Certification Authority Specification

| Field | Value |
|-------|-------|
| **Program** | REPORTING-CONSTITUTION-ENFORCEMENT-1 |
| **Constitution** | GOV-14 |
| **Date** | 2026-07-27 |

## Authority

**Architecture Authority** (with Technical Design Authority support) owns Production Certification for Reporting Platform changes.

## Certification chain (must all pass)

```
Architecture          (L2 — ADRs, ownership, laws untouched unless authorized)
      ↓
Governance            (L3 — registries, Class/Scope/Promotion/Lifecycle)
      ↓
Runtime               (L4 — mirrors integrity, no invented authority)
      ↓
Presentation          (UI/Excel/PDF semantics aligned)
```

Invalid if any lower layer contradicts a higher Truth Layer.

## Production Certified — preconditions

| Precondition | Rule |
|--------------|------|
| Constitutional Validation Record all Pass | GOV-12 |
| No open Critical/High Mirror Drift | GOV-13 |
| Mirror Integrity attested | GOV-11 |
| No upward authority / formula invention | GOV-06…10 |
| Prior program Architecture Compliance | Existing process |

## Forbidden certifications

- “Production Certified” with known constitutional fails  
- Certifying runtime-first changes that later “update docs”  
- Treating assistive unit tests alone as full GOV-12 coverage without checklist  

## Certification statement (required form)

> This release passed Constitutional Validation (GOV-12). Operational mirrors match governance registries (GOV-11). No Truth Layer inversion detected (GOV-07…10). **Production Certified** under Architecture Authority.
