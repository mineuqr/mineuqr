# CASCADE / TOCTOU AUDIT

**Program:** COMMERCIAL-LIMIT-OCCUPANCY-FINAL-AUDIT-1  

Lock order: occupancy mutex → restaurant row `SELECT … FOR UPDATE`. Delete is READ COMMITTED and locks the parent first.

Independent TiDB re-run (`commercialDomainCascadeToctou.tidb.test.ts`): 12/12.

| Race | orphan_count |
|------|----------------|
| restaurant delete ∥ category create | 0 |
| restaurant delete ∥ item create | 0 |
| restaurant delete ∥ POS provision | 0 |
| restaurant delete ∥ POS replace | 0 |
| restaurant delete ∥ order create | 0 |
| delete ∥ delete | restaurant 0 |
| create ∥ delete ∥ create | 0 |
| create ∥ create | occupancy-safe, parent valid |
| tenant B vs tenant A delete | B independent |
| failure after child insert | 0 |

G-08 P12: `orphanCategories: 0`.
