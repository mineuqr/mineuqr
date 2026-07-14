# ORDERING-CLIENT-PLATFORM-ARCHITECTURE-1 — Implementation / Certification

**Type:** Architecture Design Program (no application code)  
**Status:** **CERTIFIED**  
**Date:** 2026-07-14

---

## 1. Summary

Designed the **Ordering Client Platform** as the missing shared presentation/runtime consumption layer between Ordering Platform and ordering channels (QR, Kiosk, Waiter Device, future). Channels retain shells and channel UX only. No code was implemented in this program.

## 2. Deliverables checklist

| # | Deliverable | Location |
|---|-------------|----------|
| 1 | Architecture audit | `ARCHITECTURE.md` §2 |
| 2 | Current ownership map | `ARCHITECTURE.md` §2.2 |
| 3 | Proposed ownership map | `ARCHITECTURE.md` §3 |
| 4 | Platform boundaries | `ARCHITECTURE.md` §3.2–3.3 |
| 5 | Channel boundaries | `ARCHITECTURE.md` §3.4 |
| 6 | Composition architecture | `ARCHITECTURE.md` §4 |
| 7 | Migration strategy | `ARCHITECTURE.md` §5 |
| 8 | Risks and mitigations | `ARCHITECTURE.md` §7 |
| 9 | ADRs required | ADR-ARCH-018 + `ARCHITECTURE.md` §8 |
| 10 | Certification report | this document |

## 3. Files changed (documentation only)

| File | Change |
|------|--------|
| `docs/engineering/programs/ORDERING-CLIENT-PLATFORM-ARCHITECTURE-1/ARCHITECTURE.md` | Binding architecture |
| `docs/engineering/programs/ORDERING-CLIENT-PLATFORM-ARCHITECTURE-1/IMPLEMENTATION.md` | Certification |
| `docs/architecture/adrs/ADR-ARCH-018-ordering-client-platform.md` | Proposed ADR |
| `docs/architecture/constitution/ADR-Registry.md` | Registry entry |

## 4. Explicit non-goals completed

No Kiosk UI · No Waiter UI · No QR redesign · No Domain/Runtime/DB/Read Model/Operational changes.

## 5. Next approved steps (outside this program)

1. Architecture Authority **accepts** ADR-ARCH-018.  
2. Approve **ORDERING-CLIENT-RUNTIME-1** (shared gate/runtime consumer; QR thin wrapper).  
3. Continue M2–M5 per migration plan before channel UI programs.

## 6. Certification statement

**CERTIFIED** — ORDERING-CLIENT-PLATFORM-ARCHITECTURE-1 establishes the official architectural foundation for every present and future Ordering Channel in MineuQR. Implementation awaits ADR acceptance and a dedicated implementation program.
