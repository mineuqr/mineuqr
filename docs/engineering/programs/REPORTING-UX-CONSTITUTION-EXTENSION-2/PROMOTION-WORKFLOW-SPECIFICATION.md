# Promotion Workflow Specification

| Field | Value |
|-------|-------|
| **Program** | REPORTING-UX-CONSTITUTION-EXTENSION-2 |
| **Constitution** | KPI-09 |
| **Date** | 2026-07-27 |

## Stage definitions

| Stage | Name | Allowed surfaces | Exit criteria |
|-------|------|------------------|---------------|
| 1 | Experimental | Feature flag / internal preview / non-GA analytics | Definition draft; owner identified; not customer-GA Executive |
| 2 | Analytics | Financial / Sales / Operational Analytics (non-Executive) | Dictionary entry; Class 2–4 assigned; lifecycle documented |
| 3 | Operational Validation | Limited production Analytics; operator feedback | Stable calc; no SoT conflicts; terminology locked |
| 4 | Architecture Review | Review package only (no Exec yet) | Architecture Compliance + ownership / SoT / OBJ checks pass |
| 5 | Executive Approval | Product + Architecture sign-off | Promotion requirements checklist complete |
| 6 | Executive Dashboard | Executive Overview card | Production Certification; Executive KPI Registry updated; Class → **1** |

## Workflow (normative)

```
Propose KPI
  → Assign Class (KPI-08) — not Class 1 yet unless already Executive heritage
  → Document lifecycle (KPI-07)
  → Stage 1 Experimental
  → Stage 2 Analytics placement
  → Stage 3 Operational Validation + UAT
  → Stage 4 Architecture Review
  → Stage 5 Executive Approval (only if Exec candidate)
  → Stage 6 Executive Dashboard + reclassify to Class 1
```

KPIs that should remain Class 2–4 **stop** after Stage 3 (or Stage 4 if architecture-sensitive). They do not enter Stages 5–6.

## Artifacts per stage

| Stage | Required artifacts |
|-------|--------------------|
| 1 | Proposal; provisional business question |
| 2 | KPI Dictionary; Classification Registry; Analytics Registry update |
| 3 | UAT notes; regression for formula stability |
| 4 | Architecture Compliance Report; Impact Assessment |
| 5 | Promotion Review record; Product + Architecture approval |
| 6 | Executive KPI Registry; Business Question Registry; Certification package |

## Forbidden shortcuts

- Shipping directly to Executive Overview  
- Relabeling a Diagnostic KPI onto Executive without reclassification  
- Adding a sixth+ Executive KPI without inflation review (UX-04 budget)  
- Promoting Class 5 to customer UI without leaving Internal class via full product KPI rebirth  
