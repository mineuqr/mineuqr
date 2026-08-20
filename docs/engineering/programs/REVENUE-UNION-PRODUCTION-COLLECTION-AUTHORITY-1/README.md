# REVENUE-UNION-PRODUCTION-COLLECTION-AUTHORITY-1

**PASS — IMPLEMENTED / VALIDATED / NOT DEPLOYED**

This program defines and implements canonical Revenue Union authority
resolution when a valid published Production Collection Fact represents the
same economic payment as a legacy paid Check / Settlement Record.

It does **not** connect Cashier.
It does **not** modify Payment Confirm or PAID.
It does **not** create Collection Facts.
It does **not** write production financial data.
It does **not** create migration 0098.

## Status

| Claim | Status |
|---|---|
| Production Collection Fact authority in Revenue Union | **DEFINED** |
| Proven economic overlap → Collection Fact wins | **IMPLEMENTED** |
| Overlapping legacy Gross structurally excluded | **IMPLEMENTED** |
| Isolated BOTH → publish-neither | **PRESERVED** (not changed globally) |
| Cashier / Confirm / PAID | **UNCHANGED** |
| Collection Fact writes | **NONE** |
| Production Collection Fact rows | **NOT CREATED** (remain 0) |
| Migration | **0097** (no 0098) |
| Live production Collection Fact revenue | **NOT CLAIMED** |

## Authority rule

```
Production Collection Fact
        ↓
   proven economic overlap
        ↓
   COLLECTION FACT WINS
        ↓
legacy Check / Settlement Record Gross excluded
        ↓
ONE economic contribution
        ↓
Revenue Union
        ↓
Reporting
```

The legacy Settlement Record is **not** deleted or rewritten. It remains
available for operational history. The Union excludes it from published Gross
only when overlap is proven.

## Documents

- [ARCHITECTURE-DECISION-REPORT.md](./ARCHITECTURE-DECISION-REPORT.md)
- [AUTHORITY-RESOLUTION-SPECIFICATION.md](./AUTHORITY-RESOLUTION-SPECIFICATION.md)
- [IMPLEMENTATION-REPORT.md](./IMPLEMENTATION-REPORT.md)
- [RECONCILIATION-REPORT.md](./RECONCILIATION-REPORT.md)
- [VALIDATION-REPORT.md](./VALIDATION-REPORT.md)
