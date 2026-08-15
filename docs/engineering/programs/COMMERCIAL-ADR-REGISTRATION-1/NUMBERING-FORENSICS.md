# NUMBERING-FORENSICS.md

## Constitutional registry (before this program)

Highest **registered** ADR: **ADR-ARCH-033** (Financial Custody Plane).

IDs **034, 035, 036** were **not** present in `docs/architecture/constitution/ADR-Registry.md` (index table or document list).

There is **no ADR-ARCH-029** in the registry (gap already existed; not reused).

## Unpublished historical suggestions (not a collision)

Earlier architecture programs *recommended* but **explicitly did not publish**:

| Suggested ID | Unpublished topic | Status then |
|--------------|-------------------|-------------|
| ADR-ARCH-034 | RBAC Platform | “not published until re-acceptance” |
| ADR-ARCH-035 | Tenant Identity | “not published until final acceptance” |
| ADR-ARCH-036 | Subscription Platform | “not published until final acceptance” |

Those files do not exist under `docs/architecture/adrs/`. They are not registered ADRs. ADR Operations: numbers are assigned at Proposed and never **reused in the registry**. COMMERCIAL-CATALOG-ARCHITECTURE-1 assigned 034–036 as Proposed drafts; this program registers those commercial decisions.

**Verdict:** No constitutional ID collision. Do not renumber 001–033. Proceed with 034–036 as Commercial Catalog / Price / MRR.

## Conventions used

- Path: `docs/architecture/adrs/ADR-ARCH-NNN-<kebab-title>.md`
- Status: **Accepted** (governance)
- Implementation status: **Governance only**
- Index row + individual document link in ADR-Registry.md
