# Promotion Recommendation Report

**Program:** CAPABILITY-EXCLUDED-FORENSICS-1

| ID | Promote to Canonical Registry? | Why |
|----|-------------------------------|-----|
| CAP-14 | **NO** | Not a runtime product; language embodied in CAP-08–13 |
| CAP-18 | **NO** | Governance plane; product surface is CAP-16 |
| CAP-38 | **NO** | No collectors/API/DB; architecture-only |
| CAP-39 | **NO** | No owned workers; would collide with CAP-40 if forced |
| CAP-44 | **NO** | Process/docs, not platform capability product |
| CAP-45 | **NO** (future: **NOT YET**) | No implementation; promote only after AI-OPERATIONS ships runtime |

### Incorrect exclusions identified

**None.**

### Future promotion gates (if AA revisits)

| ID | Minimum evidence to promote |
|----|----------------------------|
| CAP-38 | Live collectors + API + non-architecture UI consuming real metrics |
| CAP-39 | Exclusive job/queue/worker runtime **without** stealing CAP-40 outbox |
| CAP-45 | `server/ai*` (or equivalent) + API/UI + tests; then Discovery add + eligibility re-run |
| CAP-14/18/44 | Do **not** promote as products; keep as ADR/governance references |
