# Excluded Capability Matrix

**Program:** CAPABILITY-EXCLUDED-FORENSICS-1

| ID | Canonical Name | Original Source | Exclusion reason (reconstruction) | Forensic classification | Promote? |
|----|----------------|-----------------|-----------------------------------|-------------------------|----------|
| CAP-14 | Financial Core Capabilities (Language) | PLATFORM-CAPABILITY-DISCOVERY-1 · ADR-ARCH-023 | Constitution language; embodied in CAP-08–13 | **GOVERNANCE ONLY** | **NO** |
| CAP-18 | Financial Custody Plane | Discovery-1 · ADR-ARCH-033 | Governance plane only | **GOVERNANCE ONLY** | **NO** |
| CAP-38 | Performance Platform | Discovery-1 · PERFORMANCE-PLATFORM-ARCHITECTURE-1 | Experimental / no product API | **EXPERIMENTAL** | **NO** |
| CAP-39 | Operations Runtime Platform | Discovery-1 · OPERATIONS-RUNTIME-PLATFORM-ARCHITECTURE-1 | Experimental; outbox owned elsewhere | **EXPERIMENTAL** | **NO** |
| CAP-44 | Architecture Governance | Discovery-1 · docs/architecture | Process/docs, not product | **GOVERNANCE ONLY** | **NO** |
| CAP-45 | AI Assistant | Discovery-1 · Subscription FEATURE-CATALOG reservation | Planned; no runtime | **PLANNED** | **NO** *(NOT YET if AI ships later)* |

### Per-capability field summary

| ID | Owner | Domain | Runtime | UI | API | DB | Completeness |
|----|-------|--------|---------|----|-----|-----|--------------|
| CAP-14 | Architecture / Settlement constitution | Settlement language | Embodied in CAP-08–13 only | None as CAP-14 | None | None as CAP-14 | N/A (language) |
| CAP-18 | Architecture; ops via CAP-16 CRMP | Custody governance | No plane package; CRMP owns code | No dedicated plane UI | — | CRMP tables under CAP-16 | Governance only |
| CAP-38 | Performance / Observability | Observability | None (architecture package) | Platform Ops architecture page | None | None | Architecture catalog |
| CAP-39 | Infrastructure architecture | Ops runtime (reserved) | None owned; outbox = CAP-40 | Platform Ops architecture pages | None | None | Architecture catalog |
| CAP-44 | Architecture Authority | Governance process | None (docs/process) | None (product) | None | None | Process complete; not product |
| CAP-45 | Planned AI Operations | AI | **None** (`server/ai*` absent) | None | None | None | Entitlement keys in docs only |
