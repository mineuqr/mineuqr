# POST-MIGRATION-VALIDATION.md

| Check | Result |
|-------|--------|
| Terminus before | 0086 |
| 0087 not previously applied | yes |
| SQL scope | CREATE TABLE only |
| Apply | `migrations applied successfully!` |
| Terminus after | **0087** id 6054102 |
| Table exists | yes |
| Columns / PK / nullability | match |
| Owner-access rows | 0 → FULL_PLATFORM default |
| 600001 | unchanged |
| Bindings | 0 |
| Live Plans / prices | unchanged |
| Invoices / payments / restaurants / orders / settlement | unchanged |
| Governance | PASS |
| `pnpm build` | PASS |
| Application code | not changed for this program |
| Deploy | not performed |
| SIMULATED_PLAN write | not performed |

## Runtime smoke (read-only)

Absent row resolves to FULL_PLATFORM by approved implementation (`interpretOwnerAccessRecord(null)`).

Local migration-session `.env` did not include `OWNER_OPEN_ID` (6 injected vars; identity env is application-runtime, not changed here). Owner user 1 still exists (openId prefix `j4Ztx2Wi`). Full entitlement smoke is deferred to application cutover. No mode mutation was performed.
