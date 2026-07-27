# Enterprise Architecture Governance Framework v1.0

| Field | Value |
|-------|-------|
| **Unique Name** | Enterprise Architecture Governance Framework |
| **Version** | 1.0.0 |
| **Status** | Pending Review |
| **Approval Authority** | Architecture Authority |
| **Effective Date** | Upon Architecture Authority adoption |
| **Previous Version** | — |
| **Successor Version** | — |
| **Program** | CROSS-DOMAIN-GOVERNANCE-1 |
| **Domain** | Enterprise / Platform-wide |

> **Related:** [Architecture Constitution v1.0](./Architecture-Constitution-v1.0.md) · [Constitution Registry](./Constitution-Registry.md) · [Versioning Framework](./Architecture-Constitution-Versioning-Framework-v1.0.md) · [Truth Layers](./Operational-Mirror-and-Truth-Layer-Constitution-v1.0.md)

---

## Constitutional status

This framework establishes **cross-domain authority**, shared governance, domain boundaries, constitutional ownership, and cross-domain dependency rules for **all** MineuQR platform domains.

It coordinates domains. It does **not** own domain business logic.

Governance only — no runtime, API, or schema changes.

Compatible with Architecture Constitution North Star: **Order is the sole Core Domain**; other platforms are bounded contexts that orbit Order through contracts and events.

---

## Platform domains (in scope)

| Platform Domain | Role (summary) |
|-----------------|----------------|
| Order Platform | Core operational domain — order lifecycle authority |
| Settlement Platform | Financial settlement plane (Check / Settlement Record publications) |
| Reporting Platform | Analytics / KPI presentation — never owns financial truth |
| Kitchen Platform | Fulfillment / kitchen display (integration context) |
| Register Platform | Cash / register custody (not money ownership) |
| Session Platform | Dining session / table session (integration / supporting) |
| Device Platform | Device identity / connectivity |
| Waiter Platform | Waiter / staff operational surfaces |
| Menu Platform | Catalog / menu / pricing supporting context |
| Future Platforms | Only via CD-06 |

Printing remains **retired** (RESET-1) until authorized re-entry — not an active domain in this matrix.

---

## RULE CD-01 — Domain Sovereignty

Every platform owns its domain.  
Ownership MUST NOT overlap.

One business object / invariant set → one authoritative domain (Architecture Constitution: every business object has one authority).

---

## RULE CD-02 — Cross-Domain Dependencies

Domains may **consume** other domains (events, contracts, read models).  
Domains MUST NOT **own** another domain’s write authority.

Dependencies SHALL remain **directional** (consumer → provider contracts; never mutual ownership).

---

## RULE CD-03 — Shared Governance

All domains inherit shared enterprise principles:

| Shared principle | Binding sources (examples) |
|------------------|----------------------------|
| Architecture | Architecture Constitution · ADRs · Versioning (CV) |
| Security | Quality Attributes · platform security ADRs |
| Identity | Identity supporting domain · ACL patterns |
| Time | Business calendar / Business Day reporting rules |
| Financial Laws | Revenue · Settlement · Refund · Tax laws / FSP ADRs |
| Reporting | Reporting Constitutions (UX/KPI/OBJ/GOV) |
| Audit | Outbox · event audit · Settlement Record immutability |
| Event Governance | ADR event / outbox / idempotency rules |

Domain constitutions MUST NOT contradict shared principles.

---

## RULE CD-04 — Cross-Domain Conflict

When domains disagree, higher authority prevails:

```
Business Law
      ↓
Architecture
      ↓
Domain Ownership
      ↓
Implementation
```

Aligns with Truth Layer hierarchy (Business → Architectural → Governance → Operational → Presentation). No exception without ADR.

---

## RULE CD-05 — Constitution Ownership

| Layer | Owns | Does not own |
|-------|------|--------------|
| Domain | Its domain constitutions, boundaries, write models | Other domains’ logic |
| Enterprise Governance (this framework + Architecture Authority) | Coordination, shared principles, conflict resolution, registry | Domain business logic / formulas |

Every domain owns its constitutions. Enterprise Governance **coordinates** them.

---

## RULE CD-06 — Future Domain Expansion

New domains MUST before production:

1. Define ownership  
2. Define boundaries  
3. Publish constitutions (CV-01…06)  
4. Register dependencies  
5. Register in Constitution Registry  

No domain enters production without governance.

---

## Architecture protection

MUST NOT modify: domain code, APIs, schema, financial laws, or existing domain ownership. Documentation / governance coordination only.
