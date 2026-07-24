# ADR-ARCH-027: Operational Document Identity Standard

> [Registry](../constitution/ADR-Registry.md)

| Field | Value |
|---|---|
| **Status** | Accepted |
| **Owner** | Architecture Authority |
| **Program** | OPERATIONAL-DOCUMENT-IDENTITY-STANDARD-1 |
| **Date** | 2026-07-24 |
| **Supersedes** | Ad-hoc document presentation formats (Settlement client `ST-` helpers as sole authority; raw `#id` session/check labels as policy) |
| **Refines** | ADR-ARCH-018 · ADR-ARCH-019 · ADR-ARCH-022 · ADR-ARCH-026 |
| **Standard** | [OPERATIONAL-DOCUMENT-IDENTITY-STANDARD.md](../standards/OPERATIONAL-DOCUMENT-IDENTITY-STANDARD.md) |
| **Implementation status** | **Partial** — Registry + Provider + Settlement adoption complete; Orders/Checks/Reporting/Printing/Notifications phased |

---

## Context

Operational UIs have leaked Persistence Identities (`sr:…`, UUIDs, composite keys) and allowed presentation layers to compose human document numbers locally. That violates platform abstraction (ADR-ARCH-006), Settlement publication clarity (ADR-ARCH-026), and Ordering Client governance (ADR-ARCH-018).

Order Business Identity (`T #` / `K #` / `WT #`) already exists under ADR-ARCH-019 but is not a cross-document registry. Settlement History introduced client-side `ST-` formatting without a shared provider.

---

## Decision

1. **Two identity planes** — Persistence Identity (internal) and Operational Identity (human) are mandatory and non-interchangeable (OI-01…OI-04).

2. **Canonical Registry** — All document types register prefix, digits, and Aggregate owner in `@shared/operational-document-identity` before implementation (AG-7).

3. **Sole Provider** — All presentation channels obtain Operational Identity from the Operational Identity Provider (OI-07 / OI-08). UI MUST NOT compose IDs.

4. **Settlement Phase 3** — Settlement / Receipt Operational Identity is `ST-######` resolved by the Provider from Check facts; Persistence Identity remains `sr:…` and is never rendered.

5. **Orthogonal to money** — Operational Identity never keys finance, Settlement calculations, or Reporting formulas (aligns ADR-ARCH-020/022/026).

6. **Phased adoption** — Orders, Checks, Reporting, Printing, Notifications migrate per the Standard migration plan without persistence migration (OI-09).

---

## Consequences

### Positive

- One human identity per document across UI / print / receipt / API  
- No persistence leakage in ops UX  
- Future document types gated by Registry  

### Trade-offs

- Existing Order display (`K #001`) remains until Phase 4 alignment to `K-000001`  
- Sequence sources may temporarily derive from existing numeric facts (e.g. Check id) until Aggregate-owned generators publish dedicated series (OI-05 full enforcement)

### Forbidden

- New client-side formatters for document numbers  
- Rendering `sr:`, `fin:`, UUIDs, or DB surrogates as document numbers  
- Using Operational Identity in domain decisions  

---

## Compliance

Architecture guards: `shared/operational-document-identity/__tests__/operationalDocumentIdentity.architecture.guards.test.ts`
