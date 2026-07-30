# COMMERCIAL-PLATFORM-ADOPTION-1 — Program Package

| Field | Value |
|-------|-------|
| **Program** | COMMERCIAL-PLATFORM-ADOPTION-1 |
| **Type** | Platform Adoption |
| **Mode** | Architecture Authority · Adoption |
| **Date** | 2026-07-30 |
| **Status** | READY FOR ARCHITECTURE AUTHORITY REVIEW |
| **Prerequisites** | COMMERCIAL-CATALOG-PUBLIC-PUBLISHING-1 · SUBSCRIPTION-RUNTIME-ENTITLEMENT-ENFORCEMENT-1 · PLATFORM-CAPABILITY-DISCOVERY-1 (capability vocabulary) |
| **Constraints** | No commercial model redesign · No subscription redesign · No billing/checkout/payment/entitlement/DB redesign · No business-rule or runtime-behavior change |

---

## Index

| Document | Purpose |
|----------|---------|
| [IMPLEMENTATION.md](./IMPLEMENTATION.md) | Change inventory |
| [ADOPTION_REPORT.md](./ADOPTION_REPORT.md) | Adoption outcomes by surface |
| [LEGACY_REMOVAL_REPORT.md](./LEGACY_REMOVAL_REPORT.md) | Removed UI legacy paths |
| [SCREEN_MAPPING.md](./SCREEN_MAPPING.md) | Screen → certified API |
| [API_ADOPTION_MATRIX.md](./API_ADOPTION_MATRIX.md) | API before/after |
| [RUNTIME_VALIDATION.md](./RUNTIME_VALIDATION.md) | Validation evidence |
| [PRODUCTION_READINESS.md](./PRODUCTION_READINESS.md) | Production gate |

---

## Verdict

The application’s commercial UI adopts the certified Commercial Platform: Public Catalog for discovery, Catalog publishing workflow for admin publication, and Subscription Runtime (via `commercial.getEntitlements`) for entitlement presentation. Invariants I-CPL-13, I-SRE-01, I-SRE-02, and I-CPP-01 are preserved.
