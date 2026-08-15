# 01 — DEPLOYMENT PROOF

## Git gate

Recorded at program start (working tree clean):

```
## main...origin/main
c1d64cba feat(commercial): cut over public plan identity to live plan uuid
```

| Check | Result |
|-------|--------|
| OD-3 implementation committed | PASS — `c1d64cba74024c22fc04a26b7c9f10caab39c5b7` |
| OD-3 implementation pushed | PASS — `HEAD` = `origin/main` |
| `origin/main` contains OD-3 | PASS |
| Working tree clean at start | PASS |

Uncommitted files created by **this certification program** are documentation and the read-only proof script only. They are not part of the deployed application.

## Deployed commit

| Field | Value |
|-------|-------|
| Expected commit | `c1d64cba74024c22fc04a26b7c9f10caab39c5b7` |
| GitHub Production deployment id | `5920875333` |
| Environment | `Production` |
| Created | `2026-08-15T13:26:40Z` |
| Status | `success` — "Deployment has completed" |
| Deployment URL | `https://mineuqr-4lohk6nsz-mineuqr-s-projects.vercel.app` |
| Application package version | `qr_menu@1.0.0` (not a unique release label) |
| Server build identity | commit SHA `c1d64cba` |

Prior Production deployment on the same environment was `a126a37e` (forensics docs only). The current Production deployment SHA is the OD-3 commit.

## Runtime confirmation (non-financial)

Live origin `https://www.mineuqr.com` at `2026-08-15T13:29:49Z`:

| Probe | Result |
|-------|--------|
| `commercialCatalog.public.listOfferings` | HTTP 200 — `planId` = Live Plan UUID |
| `commercialCatalog.public.status` | HTTP 200 — public-catalog surface up |
| `commercialCatalog.public.getOffering` | UUID accepted; malformed / integer rejected; unknown UUID 404 |
| `x-powered-by` | Express |
| `x-vercel-id` | `cdg1::iad1::qwnzz-1786800588235-af1f924d3be5` |
| `x-vercel-cache` | MISS |

Returned offering UUIDs match Production `commercial_plans.id` exactly:

| planCode | planId |
|----------|--------|
| basic | `79cf7bf7-c3b6-45de-8f20-42897cd493ac` |
| professional | `0ade795a-02fa-4d3e-b9b5-262515bade09` |
| enterprise | `d836bd10-9d9f-4408-a076-f921354d785a` |

No checkout mutation. No provider API call. No trial row created.

## Decision

**DEPLOYMENT GATE: PASS**

Production is running the committed OD-3 release. Certification is not from source code alone.
