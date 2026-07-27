# Reporting Object Model & KPI Lifecycle Constitution v1.0

| Field | Value |
|-------|-------|
| **Unique Name** | Reporting Object Model & KPI Lifecycle Constitution |
| **Version** | 1.0.0 |
| **Status** | Pending Review |
| **Approval Authority** | Architecture Authority |
| **Effective Date** | Upon Architecture Authority adoption |
| **Previous Version** | — |
| **Successor Version** | — |
| **Domain** | Reporting Object Model |
| **Owner** | Architecture Authority / Technical Design Authority |
| **Program** | REPORTING-UX-CONSTITUTION-EXTENSION-1 |
| **Extends** | Reporting UX Constitution · KPI Ownership Constitution |

> **Related:** [Architecture Constitution v1.0](./Architecture-Constitution-v1.0.md) · [Governance](./Governance.md) · [Program package](../../engineering/programs/REPORTING-UX-CONSTITUTION-EXTENSION-1/00-PROGRAM-PACKAGE.md)

---

## Constitutional status

This extension is part of the permanent **Reporting Constitution**.  
It eliminates ambiguity between reporting concepts and standardizes **KPI lifecycle** governance.

It does **not** modify financial laws, formulas, APIs, schema, ownership, or business logic. **Governance only.**

---

## Part A — Reporting Object Model

### RULE OBJ-01 — KPI (Key Performance Indicator)

A **KPI** is a canonical business metric.

A KPI MUST have:

| Requirement | Meaning |
|-------------|---------|
| One business definition | KPI-03 |
| One architectural owner | KPI-01 |
| One canonical source | KPI-02 |
| One approved business name | KPI-04 |
| One calculation method | Formula / derivation in KPI Dictionary |
| One unique identifier | `KpiId` in `kpiDictionary.ts` |
| One lifecycle | KPI-07 |

A KPI MUST be independently traceable and reproducible.

**Non-KPI:** Presentation composites without a `KpiId` (e.g. Payment Overview card) are **Widgets** or **Dashboard Cards**, not KPIs, until elevated via dictionary + ADR.

---

### RULE OBJ-02 — Widget

A **Widget** is a presentation component.

- Presents one or more KPIs (or tender aggregates bound to a canonical publication path).  
- Does **NOT** own data.  
- Does **NOT** define calculations.  
- Does **NOT** become a Source of Truth.  

Widgets may change without affecting KPI semantics.

---

### RULE OBJ-03 — Analytics

**Analytics** is a logical collection of related KPIs.

- Exists to answer a broader business question.  
- Groups KPIs; **never owns** KPIs.  

Examples: Sales Analytics · Financial Analytics · Refund Analytics · Payment Analytics.

---

### RULE OBJ-04 — Dashboard Card

A **Dashboard Card** is a UI representation.

- Displays one KPI or one Widget.  
- Presentation only.  
- Never defines calculations.  
- Never defines ownership.

---

## Reporting object relationships

```
Business Event
      ↓
Canonical Source
      ↓
KPI
      ↓
Widget
      ↓
Dashboard Card
      ↓
Dashboard
      ↓
Export (Excel · PDF)
```

Each layer has **one** responsibility. Responsibilities MUST NEVER overlap.

| Layer | Responsibility | MUST NOT |
|-------|----------------|----------|
| Business Event | Domain fact of life | Invent KPIs |
| Canonical Source | Persist / publish truth | Present UI |
| KPI | Define metric semantics | Own presentation layout |
| Widget | Compose presentation | Own data / formulas |
| Dashboard Card | Render one unit | Own / calculate |
| Dashboard | Orchestrate areas | Redefine KPI meaning |
| Export | Serialize same semantics | Invent alternate definitions |

---

## Part B — KPI Lifecycle (RULE KPI-07)

### RULE KPI-07 — Lifecycle ownership

Every KPI MUST define its complete lifecycle. Lifecycle documentation is **mandatory**.

Each KPI MUST explicitly document:

| Lifecycle stage | Question answered |
|-----------------|-------------------|
| Producer | Where was this produced? |
| Canonical Source | Where is the source of truth? |
| Architectural Owner | Who owns the plane / write authority? |
| Projection (if applicable) | Which read model / projection? |
| Reporting Service | Which reporting service transforms / serves it? |
| Presentation Components | Which UI displays it? |
| Export Components | Which Excel / PDF surfaces include it? |
| Consumers | Who consumes it (apps, APIs, exports)? |

### Financial plane example

```
Producer → Check Management
Canonical Source → Settlement Record
Architectural Owner (plane) → Settlement Platform
Reporting Service → Reporting Platform
Presentation → Dashboard
Export → Excel
Export → PDF
```

### Operational plane example

```
Producer → Order Platform
Canonical Source → Order Read Model
Architectural Owner → Order Platform
Reporting Service → Reporting Platform
Presentation → Dashboard
Export → Excel · PDF
```

### Traceability

Every KPI MUST be traceable from presentation back to production so engineers can answer:

1. Where was this KPI produced?  
2. Where is its canonical source?  
3. Who owns it?  
4. Who consumes it?  
5. Which services transform it?  
6. Which UI components display it?  
7. Which exports include it?

### Change governance

Any lifecycle modification requires:

1. Architecture Review  
2. ADR  
3. Impact Assessment  
4. Regression Validation  
5. Production Approval  

Lifecycle changes MUST NOT occur implicitly.

---

## Architecture protection

This extension MUST NOT modify: Financial / Revenue / Refund / Settlement / Tax laws; reporting formulas; APIs; database schema; read/write models; domain or event ownership.

---

## Amendment

Amendments require Architecture Authority approval. Ownership or semantic changes additionally require KPI-06 process.
