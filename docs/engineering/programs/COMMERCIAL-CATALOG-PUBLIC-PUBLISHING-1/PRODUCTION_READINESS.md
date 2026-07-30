# PRODUCTION_READINESS.md — COMMERCIAL-CATALOG-PUBLIC-PUBLISHING-1

| Field | Value |
|-------|-------|
| **Gate status** | **PRODUCTION READY** (Architecture Authority) |
| **Amendment** | Revision 1 — **I-CPP-01** (documentation only) |
| **Certification** | Remains **valid** — implementation unchanged |

---

## Checklist

| Gate | Status | Notes |
|------|--------|-------|
| Catalog is publishing SSOT | PASS | CatalogPublishingService wraps PublicationService + overlay |
| Public catalog deterministic | PASS | Visibility matrix + stable sort |
| Draft / internal never public | PASS | Validated |
| Deprecated historically addressable | PASS | get-by-id only |
| Retired not newly adoptable | PASS | Inaccessible on public get; not in browse |
| Archived inaccessible | PASS | Overlay archived |
| No runtime entitlement coupling | PASS | Isolation tests |
| **I-CPP-01 Published Catalog Isolation** | **PASS** | Compliant without code change — see Amendment Rev 1 validation |
| Snapshots untouched by publish | PASS | No binding/snapshot writes in publishing path |
| Optional cache non-SSOT | PASS | Opt-in env; invalidate on write; not authz surface |
| No billing / checkout / payment | PASS | Out of scope; not introduced |
| No commercial model redesign | PASS | Foundation enum / DB unchanged |
| Validation suite green | PASS | 9/9 (pre-amendment; unchanged) |

---

## I-CPP-01 compliance (docs-only confirmation)

| Requirement | Status |
|-------------|--------|
| Published Catalog is not a Runtime Authority | COMPLIANT |
| No Feature / Limit / lifecycle / eligibility evaluation in Published Catalog | COMPLIANT |
| No runtime authorization path consults Published Catalog | COMPLIANT |
| Commercial Snapshot remains exclusive runtime source | COMPLIANT |
| Implementation unchanged by Amendment Rev 1 | CONFIRMED |

---

## Ops notes

- Enable browse cache only if needed: `PUBLIC_CATALOG_CACHE=1`
- Due schedules: invoke `commercialCatalog.publishing.applyDueSchedules` from admin/ops job (no embedded cron in this program)
- Existing admin `publishVersion` remains for direct draft publish (compat); prefer `publishing.publishVersion` for governed flow

---

## Residual (non-blocking)

| Item | Class |
|------|-------|
| Approved / Scheduled / Archived not persisted to DB | Governance overlay — acceptable under “no commercial model redesign”; promote to foundation only under future AA program |
| Public Pricing UI still may use `subscription.listPlans` bridge | Compat consumer; can switch to `commercialCatalog.public.listOfferings` in a follow-on UX program |
| Overlay process-local | Multi-instance ops should treat overlay as ephemeral until persisted program is authorized |

---

## Success criteria mapping

| Criterion | Met |
|-----------|-----|
| Commercial Catalog = canonical publishing platform | Yes |
| Public catalog deterministic | Yes |
| No runtime dependency on mutable Catalog for entitlement | Yes |
| **I-CPP-01 formally adopted** | Yes |
| Publishing does not affect existing subscriptions | Yes |
| Production readiness / certification remains valid | Yes |

---

## STOP

Amendment Rev 1 recorded. Production Certification remains valid.
