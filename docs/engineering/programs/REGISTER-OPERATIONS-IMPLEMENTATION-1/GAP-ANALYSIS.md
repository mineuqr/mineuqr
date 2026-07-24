# REGISTER-OPERATIONS-IMPLEMENTATION-1 — Gap Analysis (Phase 1)

| Field | Value |
|---|---|
| **Program** | REGISTER-OPERATIONS-IMPLEMENTATION-1 |
| **Date** | 2026-07-24 |
| **Constitution** | ADR-ARCH-022 · 028 · **030** · REGISTER-OPERATIONS-PLATFORM-1 |
| **Mode** | Implementation map (pre-change) |

---

## 1. Current Register Aggregate (implemented)

| Concern | Status | Location |
|---------|--------|----------|
| Catalog lifecycle `provisioned → active ⇄ inactive` | Implemented | `registerLifecycle.ts`, `registerCommands.ts` |
| Provision / Activate / Deactivate | Implemented | commands + `RegisterDomainService` |
| Device bind / unbind (`deviceId`) | Implemented | commands + service (no events) |
| Version / timestamps | Implemented | AR fields |
| Persistence `crmp_registers` | Implemented | 0077 + Drizzle / in-memory |
| Guard: deactivate blocked by active Shift | Implemented | deactivate + service |
| Guard: Catalog `active` required to open Shift | Implemented | `assertRegisterCanOpenShift` (catalog only) |

---

## 2. Architecture-only (gaps)

| Concern | Architecture source | Gap |
|---------|---------------------|-----|
| Duty statuses `closed \| open \| suspended` | ADR-030 · ROP §5.2 | **Not on AR / not persisted** |
| `OpenRegister` / `CloseRegister` / `SuspendRegister` / `ResumeRegister` | ROP §6 | **Missing** |
| `assignedOperatorUserId` / Assign / Release / Reassign | ROP §4 · §6 | **Missing** |
| Duty-gated Shift open | ADR-030 sequencing | Catalog-only today |
| Close Register blocked by active Shift | ADR-030 | Deactivate only; no CloseRegister |
| Resolve active / by device / by operator | ROP §6.1 | **Missing** |
| Canonical Register domain events | ROP §7 | **Missing** |
| Dual-plane deactivate (Duty closed) | ROP §4.2 | Deactivate ignores Duty |

---

## 3. Implementation map (authorized)

| Deliverable | Approach |
|-------------|----------|
| AR fields | Additive: `dutyStatus`, `assignedOperatorUserId`, `operatorAssignedAt` |
| Persistence | Additive migration **0079** (nullable/default-safe); production deploy **not** authorized by this program |
| Duty lifecycle | Pure commands + lifecycle guards (mirror Shift pattern) |
| Operator | Assign / Release / Reassign; one active operator per Register; restaurant uniqueness while Duty open/suspended |
| Device | `attachDevice` / `detachDevice` / `replaceDevice` (+ keep bind/unbind aliases) |
| Events | Collected facts (no bus/outbox), claimKey pattern |
| Shift open guard | Require Catalog `active` **and** Duty `open` |
| Settle context | Gap when Register Duty `closed` (fail-open preserved) |
| API / UI | **Out of scope** |

---

## 4. STOP check

| STOP condition | Triggered? |
|----------------|------------|
| Register becomes financial owner | No |
| Financial Shift / Check / SR ownership change | No |
| Aggregate redesign | No — Register remains AR |
| Non-additive schema | No — additive columns only |

**Proceed to implementation.**
