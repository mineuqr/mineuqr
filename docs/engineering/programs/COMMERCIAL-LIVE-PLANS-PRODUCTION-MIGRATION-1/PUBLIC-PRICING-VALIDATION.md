# PUBLIC-PRICING-VALIDATION.md

Path:

Admin Live Plan → Persistent DB → Catalog Hydration → `projectPublicCatalogOfferings`

There is no memory-only catalog as SSOT after bootstrap (second CLI pass sourced `db`). There is no publication step, no bootstrap-as-publish, and no stale version lookup (version table dropped).

## Production DB

Three live plans are persisted with catalog prices in [PRICING-VALIDATION.md](./PRICING-VALIDATION.md). Public pricing after application deploy hydrates from these rows.

## Automated proof (no production test-only price edit)

| Test | Result |
|------|--------|
| Bootstrap exposes live plans on public catalog immediately | PASS |
| Live plan edit propagates to public catalog after `saveLive` | PASS |
| Hidden plans omitted | PASS |

Production Professional / prices were **not** temporarily rewritten for this check. Restoring a test-only change was therefore not required.

## Residual

HTTP public Pricing against the currently deployed application was **not** exercised. Deploy is out of scope for this program. Until the live-plan application is deployed, the running site still serves the previous code against the new schema.
