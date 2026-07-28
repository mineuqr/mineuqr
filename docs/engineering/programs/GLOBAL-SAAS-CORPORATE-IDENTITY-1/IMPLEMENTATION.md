# IMPLEMENTATION — GLOBAL-SAAS-CORPORATE-IDENTITY-1

**Date:** 2026-07-28

## Architecture added

| Artifact | Purpose |
|----------|---------|
| `client/src/const/companyLegal.ts` | Post-Atlas legal entity fields; `MINEUQR_PUBLISH_COMPANY_LEGAL` gate; `getPublicCompanyLegal()` |
| `client/src/const/publicPresence.ts` | Optional external Docs / Status / Roadmap URLs (null until real) |
| `client/src/const/trustCenterRegistry.ts` | Catalog of published trust resources |
| `client/src/components/landing/MarketingCorporateShell.tsx` | Shared chrome for corporate pages (existing design language) |

## Pages & routes

| Route | Page | Notes |
|-------|------|-------|
| `/trust` | Trust Center hub | Indexes published registry entries; states no SOC/ISO claims |
| `/subprocessors` | Subprocessors | AWS S3, Tap, PayPal — mirrors Privacy |
| `/dpa` | DPA entry | Available on request; no fabricated PDF |
| `/security/disclosure` | Responsible Disclosure | Reports via `info@mineuqr.com` |
| `/docs` | Documentation entry | In-product docs; external URL when configured |
| `/roadmap` | Roadmap entry | Shipped pillars only; enterprise contact for private roadmap |
| `/status` | Status architecture | Honest “no public status page yet”; links out when URL set |

Wired in `App.tsx`. Sitemap + robots updated.

## Narrative & consistency

- About (EN/AR): OS positioning, why/philosophy, corrected 2026 milestone, brand/logo/WhatsApp constants, locale contact section.
- Softened unverifiable “24/7” support claims → Email/WhatsApp / priority support.
- Pricing help copy mentions Tap + PayPal.
- Footer: Product / Company / Trust / Legal columns; shows legal entity **only** when publish gate + required fields are set.

## Tests

`client/src/const/companyLegal.test.ts` — publish gate, null presence URLs, trust registry (3 passing).

## Operator enablement (post-Atlas)

1. Fill `MINEUQR_COMPANY_LEGAL` with verified values.  
2. Set `MINEUQR_PUBLISH_COMPANY_LEGAL = true`.  
3. Optionally set `MINEUQR_PUBLIC_*_URL` in `publicPresence.ts` when real destinations exist.
