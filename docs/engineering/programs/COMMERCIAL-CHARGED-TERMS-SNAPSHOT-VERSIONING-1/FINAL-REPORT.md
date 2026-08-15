# FINAL REPORT

**Program:** COMMERCIAL-CHARGED-TERMS-SNAPSHOT-VERSIONING-1  
**Date:** 2026-08-15  
**HEAD at start:** `e936e654` (`test(commercial): align live plan identity guard`) on `main`  
**STATUS:** IMPLEMENTATION COMPLETE — **not committed, not pushed, not deployed, 0089 not applied**

## Answers

1. **Current Charged Terms ownership**  
   Authority is insert-only `commercial_subscription_charged_terms`.  
   `commercial_subscription_bindings` remains 1:1 **enrollment** (subscription ↔ Live Plan association). Binding charged columns are leftover projection / pre-0089 fallback only. Once a snapshot exists, it wins.

2. **Why single-row Charged Terms was insufficient**  
   Binding is unique on `subscriptionId`. A plan or cycle change had nowhere to store Snapshot #2 without `UPDATE` of Snapshot #1. That violates historical financial truth (I-CTS-01, I-CTS-03, I-CTS-04).

3. **Chosen snapshot model**  
   **B — dedicated insert-only snapshot table.**  
   Binding is not the version container. Model A (version rows on Binding) would still fight the 1:1 unique enrollment key. No existing versioned Charged Terms table was present (`planVersionId` / `snapshotId` were dropped in 0086).

4. **Snapshot primary identity**  
   UUID `id`. Not a PayPal/Tap transaction id, invoice number, check id, or payment id (I-CTS-16).

5. **Subscription relationship**  
   One subscription → many snapshots. Unique `(subscriptionId, version)`. Ordered by `effectiveFrom`, then `version`.

6. **CURRENT SNAPSHOT RULE** (exactly one method)  
   ```
   WHERE subscriptionId = S
   ORDER BY effectiveFrom DESC, version DESC
   LIMIT 1
   ```  
   Fallback only if the table has no row for S: Binding leftover charged columns (pre-0089 Production). Do not use `createdAt` alone. Do not sum versions. Do not use Live Plan current price.

7. **Effective-date semantics**  
   Immediate changes only. `effectiveFrom = mutation commit time` (`nowIso()`).  
   No `effectiveTo` column (avoids mutating historical rows). Supersession = allowed transition (I-CTS-11).  
   Future-dated / renewal-scheduled changes are **not** implemented and have no input.

8. **Plan-change semantics**  
   Admin selects Live Plan B → `resolveLivePlanById` → `currentPriceForPlan(B, selectedCycle)` → insert Snapshot #N+1 → update `user_subscriptions.planId` and enrollment `bindings.planId` in **one SQL transaction**. Snapshot #N is not updated.

9. **Billing-cycle-change semantics**  
   Same transaction path. Yearly uses the yearly Live Plan offer; monthly uses the monthly offer. Never `99 * 12`. Never overwrite Snapshot #1.

10. **Live Plan price authority**  
    New commitments: `pricingService.currentPriceForPlan(planId, selectedCycle)` only.  
    Catalog price edits do **not** auto-insert subscription snapshots. Historical rows are never recalculated from today’s catalog (I-CTS-02, I-CTS-09).  
    `subscription_plans` and `legacyPlanId` are not price authorities (I-CTS-07, I-CTS-08).

11. **Historical immutability**  
    No UPDATE of snapshot financial columns.  
    Webhook `onDuplicateKeyUpdate` no longer writes `chargedAmount` / currency / cycle (only `planId`, `legacyPlanId`, `updatedAt`).

12. **MRR behavior**  
    Qualifying subscription → **current** Charged Terms snapshot → monthly equivalent.  
    Versions are not summed. Pre-0089: Binding leftover fallback so Production MRR does not drop to 0 when the table is absent. Never Live Plan catalog price.

13. **Invoice behavior**  
    `generateInvoicePDF` still reads `getSubscriptionCommercialBinding`, which overlays current snapshot charged fields. New invoices freeze that amount on `invoices.amount`. Historical invoice rows are untouched.  
    Period-as-of (invoice a past window against Snapshot #1 while Snapshot #2 is current) is **not** implemented. Admin PDF is issued “now”. STOP was not required: issue-time selection is deterministic.

14. **Entitlement behavior**  
    Unchanged: current `user_subscriptions.planId` (Live Plan UUID) → Entitlement Hub. Charged Terms do not grant capabilities (I-CTS-15). Trial semantics unchanged.

15. **Idempotency**  
    If current snapshot already matches planId + amount + currency + cycle → no insert.  
    Duplicate `(subscriptionId, version)`: re-read; match → success; mismatch → fail closed.

16. **Atomicity / compensation classification**  
    | Path | Class | Mechanism |
    |------|-------|-----------|
    | Admin plan/cycle update | **A** | `db.transaction`: snapshot insert then subscription + enrollment identity |
    | Admin create | **B** | Existing compensation: Binding + snapshot after subscription insert; snapshot failure deletes Binding; persist failure deletes subscription |
    | Webhook / trial bind | fail-soft | Unchanged payment activation; snapshot insert errors recorded, not Admin fail-closed |

    Compensation is not called atomic.

17. **Production data impact**  
    Mutation **NONE**. Snapshot table **absent**.  
    Fresh SELECT `2026-08-15T16:52:23.980Z`, `DATABASE()=mineuqr`, server_ts `2026-08-15T13:52:26.000Z`:

    | Population | Count |
    |------------|------:|
    | `user_subscriptions` | 7 |
    | bindings | 3 |
    | snapshot rows | 0 (table missing) |
    | duplicate bindings | 0 |
    | unbound | 4 (600001, 690001, 750001, 780001) |

    Complete bindings 0089 would copy **exactly** (no Live Plan inference):  
    810001 = 19.00 USD monthly; 840001 = 19.00 USD monthly; 870001 = 29.00 USD monthly.  
    780001 remains present, unbound, yearly — **do not backfill**.  
    Prior SELECT (same day, 16:17Z) had 6 subscriptions / 2 bindings; `870001` appeared outside this program.

18. **Migration status**  
    `drizzle/0089_commercial_charged_terms_snapshots.sql` designed, journal terminus 0089 / 90 entries. Additive CREATE + INSERT…SELECT of complete Binding rows. Does **not** DROP Binding charged columns. **Not applied.** Not added to Production schema-verify until authorized.  
    Rollback: DROP TABLE if no newer-than-copy snapshots exist.

19. **Tests** (targeted, all passed)  
    - `chargedTermsSnapshotVersioning.test.ts` — 7  
    - `adminChargedTermsCompletion.test.ts` — 18  
    - `subscriptionAudit.test.ts` — 15  
    - `adminSubscriptionChargedTermsIntegrity.guards.test.ts` — 6  
    - `canonicalMrrChargedTerms.guards.test.ts` — 2  
    - `migrationGovernance.test.ts` — 12  
    - `commercialSnapshotRuntimeAuthority.test.ts` — 5  
    - `livePlanIdentity.guards.test.ts` — 6  
    - `trial-and-webhook.test.ts` — 6  
    - `admin-invoice-billing.test.ts` — 5  

20. **Build**  
    `pnpm build` **passed** (exit 0). Existing Vite chunk-size / `__vite-browser-external` warnings are repository debt, not caused by this program.

21. **Git status**  
    Branch `main` at `e936e654`. Working tree **dirty**, uncommitted. Do not commit / push unless authorized.  
    New: snapshot table schema, 0089, `chargedTermsSnapshots.ts`, program docs.  
    Modified: Admin create persist, Admin update, webhook bind, MRR loader, journal/governance, tests.

22. **Remaining gaps**  
    - Complimentary periods: out of scope (do not use `chargedAmount = 0`).  
    - Webhook bind remains fail-soft; omitted cycle still defaults to monthly inside `chargedTermsForPlan` (pre-existing; not worsened as a checkout redesign).  
    - Invoice as-of past period not implemented.  
    - Binding leftover columns not dropped (OD-4 / later).  
    - Unbound Production rows stay without snapshots (no inference).  
    - Runtime snapshot writes require 0089; do not deploy one without the other.

23. **Can complimentary periods be built on this?**  
    **Yes, later, in a separate program.** A concession is timing/eligibility beside immutable snapshots — not a zero-price rewrite of historical Charged Terms, and not a trial conversion.

## Deploy constraint

Do **not** deploy this runtime without applying 0089.  
Do **not** apply 0089 without this runtime’s readers.  
Do **not** mutate Production in this program.

## Success condition

Met in architecture and uncommitted code:

One subscription → multiple immutable Charged Terms snapshots → one deterministically applicable snapshot at each point in time (immediate changes).

Live Plan = current catalog offer. Charged Terms = historical commitment. MRR = effective Charged Terms. Entitlements = current Live Plan. `subscription_plans` / `legacyPlanId` / provider IDs have no snapshot or price authority.
