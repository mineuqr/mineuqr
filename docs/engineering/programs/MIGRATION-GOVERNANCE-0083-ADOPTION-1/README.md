# MIGRATION-GOVERNANCE-0083-ADOPTION-1 — Program Index

| Document | Path |
|----------|------|
| Root Cause Report | [ROOT-CAUSE-REPORT.md](./ROOT-CAUSE-REPORT.md) |
| Migration Governance Report | [MIGRATION-GOVERNANCE-REPORT.md](./MIGRATION-GOVERNANCE-REPORT.md) |
| Journal Validation Report | [JOURNAL-VALIDATION-REPORT.md](./JOURNAL-VALIDATION-REPORT.md) |
| Migration Chain Validation | [MIGRATION-CHAIN-VALIDATION.md](./MIGRATION-CHAIN-VALIDATION.md) |
| Drift Analysis | [DRIFT-ANALYSIS.md](./DRIFT-ANALYSIS.md) |
| Repository Consistency Report | [REPOSITORY-CONSISTENCY-REPORT.md](./REPOSITORY-CONSISTENCY-REPORT.md) |
| Production Readiness Report | [PRODUCTION-READINESS-REPORT.md](./PRODUCTION-READINESS-REPORT.md) |
| Column name probe | [_column-name-probe.mjs](./_column-name-probe.mjs) |

## Final verdict

**B. Restored with observations**

Observation: SQL `AFTER` clause corrected to `identityScope` (proven mismatch with 0066 / production). Hash updated and audited.

Do **not** commit / push / deploy / run production migrate until Architecture Authority approval. Next program: **PRODUCTION-MIGRATION-EXECUTION-0083**.
