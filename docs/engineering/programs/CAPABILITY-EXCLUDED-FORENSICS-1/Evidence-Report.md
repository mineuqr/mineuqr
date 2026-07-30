# Evidence Report

**Program:** CAPABILITY-EXCLUDED-FORENSICS-1

---

## CAP-14 — Financial Core Capabilities (Language)

| Field | Evidence |
|-------|----------|
| Original source | `PLATFORM_CAPABILITY_CATALOG.md` CAP-14; ADR-ARCH-023 |
| ADR | `docs/architecture/adrs/ADR-ARCH-023-financial-core-capabilities.md` — Accepted; Implementation **Not implemented** |
| Dedicated module | **None** — no `server/financial-core`, no `shared/financial-core` |
| Embodiment | CAP-08–13 under `server/operational-session/check`, `shared/operational-session/check` (split/refund/MCA/SR) |
| Program docs | `docs/engineering/programs/FINANCIAL-CORE-CAPABILITIES-ARCHITECTURE-1/` |
| Classification | **GOVERNANCE ONLY** |

---

## CAP-18 — Financial Custody Plane

| Field | Evidence |
|-------|----------|
| Original source | Catalog CAP-18; ADR-ARCH-033 |
| ADR | `docs/architecture/adrs/ADR-ARCH-033-financial-custody-plane.md` — **Governance only** |
| Dedicated plane package | **None** |
| Related runtime (CAP-16) | `shared/crmp/`, `server/crmp/`, `checkSettlementAttributionAdoption.ts`, `crmp_settlement_attributions` (drizzle 0077) |
| Classification | **GOVERNANCE ONLY** (plane); runtime counted under CAP-16 |

---

## CAP-38 — Performance Platform

| Field | Evidence |
|-------|----------|
| Package | `shared/performance-platform/` — architecture/catalog only (barrel states no collectors/APIs/hooks) |
| Server imports | **None** of `@shared/performance-platform` |
| UI | `/admin/platform/performance` — `status: "architecture"` in `platformOpsSections.ts` |
| Guards | `performancePlatformArchitecture.architecture.guards.test.ts` — `scoringImplemented === false`, no product API |
| Classification | **EXPERIMENTAL** |

---

## CAP-39 — Operations Runtime Platform

| Field | Evidence |
|-------|----------|
| Package | `shared/operations-runtime-platform/` — architecture only; workers/queues `reserved` |
| Server imports | **None** |
| Production workers | Order outbox/relay under CAP-01/CAP-40 (`server/order/infrastructure/events/`) |
| UI | Platform Ops jobs/events/diagnostics — architecture status |
| Guards | `operationsRuntimePlatformArchitecture.architecture.guards.test.ts` |
| Classification | **EXPERIMENTAL**; production delivery = CAP-40 |

---

## CAP-44 — Architecture Governance

| Field | Evidence |
|-------|----------|
| Corpus | `docs/architecture/**` (constitutions, ADRs, ARB ops) |
| Pre-commit program | PRE-COMMIT-GOVERNANCE-HARDENING-1 — docs audit, not product hook surface |
| Product UI/API/DB | **None** |
| Classification | **GOVERNANCE ONLY** |

---

## CAP-45 — AI Assistant

| Field | Evidence |
|-------|----------|
| `server/ai*` / `shared/ai*` | **0 files** |
| LLM deps in package.json | **None** (no openai/anthropic/@ai-sdk) |
| Entitlement keys | Docs only: SUBSCRIPTION-PLATFORM-ARCHITECTURE-1 `feature.ai_assistant`, `limit.ai_usage` |
| Runtime stub | **None** |
| Classification | **PLANNED** |
