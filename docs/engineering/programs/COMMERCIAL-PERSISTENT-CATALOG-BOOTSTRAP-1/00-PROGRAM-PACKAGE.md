# COMMERCIAL-PERSISTENT-CATALOG-BOOTSTRAP-1 — Program Package

| Field | Value |
|-------|-------|
| **Program** | COMMERCIAL-PERSISTENT-CATALOG-BOOTSTRAP-1 |
| **Type** | Architecture Adoption · Persistent Catalog Bootstrap |
| **Date** | 2026-07-31 |
| **Status** | READY FOR ARCHITECTURE AUTHORITY REVIEW |

### Non-goals

Do **not** redesign Discovery · Projection · Presentation · Publication architecture.  
Do **not** invent fake capability logic · manual SQL seeds · duplicate publish pipelines.  
Do **not** commit / push / deploy.

### Companion defect fixed (required for hydrate)

Drizzle `mysqlEnum("cc_billing_interval_unit", …)` caused SELECT of non-existent column `cc_billing_interval_unit` instead of `intervalUnit`. Schema mapping corrected to physical column names (no DDL migration).

---

## Deliverable index

| Document |
|----------|
| [Persistent-Catalog-Bootstrap-Report.md](./Persistent-Catalog-Bootstrap-Report.md) |
| [Bootstrap-Execution-Report.md](./Bootstrap-Execution-Report.md) |
| [Publication-Consistency-Report.md](./Publication-Consistency-Report.md) |
| [Persistent-Catalog-Validation-Report.md](./Persistent-Catalog-Validation-Report.md) |
| [Restart-Validation-Report.md](./Restart-Validation-Report.md) |
| [Architecture-Test-Report.md](./Architecture-Test-Report.md) |
| [FINAL-REPORT.md](./FINAL-REPORT.md) |
