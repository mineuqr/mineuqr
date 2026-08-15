# FINAL-REPORT.md — COMMERCIAL-CATALOG-PLANS-MRR-UI-AUDIT-CLEANUP-1

**Date:** 2026-08-15  
**Verdict:** **READY FOR ARCHITECTURE AUTHORITY REVIEW**

This program does **not** authorize commit, push, or production deployment.

---

## Answers required by the program

1. **Is Live Plan the commercial catalog SSOT?** Yes for identity, capabilities, limits, and public list prices. Checkout and MRR still use `subscription_plans`.
2. **Capabilities correctly represented?** Editor and Pricing show Presentation of the Live bundle. Most keys are flags_only — not commercially “implemented” under CE-04.
3. **Limits correctly represented?** Yes in persistence, editor, and create-path runtime (`restaurants` / `categories` / `items`). Pricing omits them. Extra vocabulary keys are orphaned.
4. **Prices correctly represented?** Dual book: catalog display vs checkout charge. Intentional unfinished cutover.
5. **Checkout legacy boundary justified?** **LEGACY_COMPATIBILITY** — required until a checkout cutover. Do not delete `subscription_plans`.
6. **Subscription identity?** Instance = `user_subscriptions`; runtime composition = binding → Live Plan. Competing int vs UUID is documented.
7. **MRR source?** Implemented from `subscription_plans` via `CanonicalMetricsService`, not charged terms.
8. **MRR policy complete?** **No. GOVERNANCE GAP.**
9. **Price change preserves charged terms?** **Yes**, until explicit re-bind (renewal/upgrade).
10. **Pricing UI vs truth?** Feature list = published catalog. Price may not match charge. Limits missing.
11. **Plan Editor vs truth?** Capabilities, limits, USD prices match Live Plan. Regional SAR hidden but preserved.
12. **Dashboard vs truth?** Plan/Frozen/owner OK; many tabs are UI-only vs server.
13. **Subscription UI vs truth?** Partial; cancel stub; charged terms not shown.
14. **Owner simulation vs truth?** Matches Owner Access architecture. No billing.
15. **Frozen UI vs account state?** Redirect, mutation deny, QR frozen — aligned.
16. **QR vs account state?** Slug valid; Frozen does not serve active menu.
17. **Visible?** Pricing, Editor, Dashboard (ACTIVE), Subscription, Owner controls, Frozen banner.
18. **Hidden?** Diagnostics route, Pricing limits, regional editor fields, foundation/expo cards, version stubs’ real functions.
19. **Locked?** Owner checkout; always-on editor cards; Frozen dashboard.
20. **Directly accessible?** `/pricing`, `/subscription`, `/dashboard` (Frozen redirected), `/commercial/diagnostics`, admin catalog.
21. **Server vs UI aligned?** Partial. Devices, ordering, limits, Frozen aligned. Most capabilities and template/color/font gates are not.
22. **Duplicate authorities?** Yes: checkout/MRR vs catalog; `isSubscriptionActive` vs hub; unbound Legacy Bridge.
23. **Intentional legacy?** `subscription_plans`, `PLAN_LIMITS`, snapshot event names, seed-plans.mjs.
24. **Files safely deleted?** **None.**
25. **Retained historical?** All prior COMMERCIAL-* AA docs and migrations.
26. **Future review?** Stub experience panels; rename `snapshotLoader.ts`; retire `seed-plans.mjs`; MRR constitution; UI truthfulness; flags_only enforcement.
27. **Governance gaps?** Yes — [GOVERNANCE-GAPS.md](./GOVERNANCE-GAPS.md).
28. **Follow-on programs?** COMMERCIAL-MRR-CONSTITUTION-1; COMMERCIAL-UI-TRUTHFULNESS-1; checkout catalog alignment; per-capability enforcement; retire `isSubscriptionActive`; Limits constitution addendum.

## Invariants

I-CATALOG-01…12, 14–16 hold with documented legacy boundaries.  
**I-CATALOG-13 (one MRR authority) is a GOVERNANCE GAP** — not silently “fixed.”

## Safety

- Limits-repair and all listed prior programs preserved.
- No production data or commercial policy changes.
- No commit / push / deploy.
- Cleanup log: 0 deletions.

## Checklist

- [x] Catalog / Live Plans / Capabilities / Limits / Prices audited
- [x] Subscriptions / Checkout / MRR / price-change audited
- [x] Plan Editor / Pricing / Dashboard / Subscription / Owner / Frozen / QR / Hidden / Routes audited
- [x] Hardcoded values / legacy catalog / duplicate authorities audited
- [x] Repository cleanup completed safely (zero SAFE_TO_DELETE)
- [x] Cleanup log complete; historical + legacy preserved
- [x] Cursor rules / scripts / documentation audited
- [x] Truth matrices + governance gaps complete
- [x] No production data or policy changed
- [x] Build passes (`pnpm build`)
- [x] Relevant tests pass (25)
- [x] No new errors in changed files (documentation only)
