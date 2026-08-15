# FINAL REPORT — COMMERCIAL-PLAN-CAPABILITY-GATING-CONTRACT-1

**STATUS:** CONTRACT COMPLETE — READY FOR IMPLEMENTATION  
**NEXT PROGRAM:** COMMERCIAL-PLAN-CAPABILITY-GATING-IMPLEMENTATION-1  

Do not start implementation in this program. No code, schema file, Production DML, commit, push, or deploy.

---

## 1. What are the four canonical capability keys?

| Display | Canonical key |
|---------|----------------|
| Session Management | `sessionTableManagement` |
| Menu & Item Management | `menuManagement` |
| Menu Design | `menuDesign` |
| QR Codes | `smartQr` |

UI = catalog = runtime = `requireFeature` argument. No aliases.

## 2. Where is their authoritative state stored?

`commercial_bundle_features` on the Live Plan’s feature bundle (`included=true` or absent). Resolved through the current entitled `user_subscriptions.planId` → Live Plan → bundle → entitlement hub.

Not Charged Terms. Not MRR/ARR. Not client flags.

## 3. Can Admin independently enable/disable them?

**Yes — after implementation.** Today they are locked Always-On cards. Contract: unlock Plan Editor; persist via existing `replaceIncludedFeatures`.

## 4. What exact operations does each capability control?

See the four capability files and `API-ENFORCEMENT-CONTRACT.md`.

- **Session:** owner session mutations + owner timeline/workspace. Not table CRUD. Not public session GET. Not order/check/register.
- **Menu & Items:** category / menuItem / offer mutations + editor lists. Not public catalog GET.
- **Menu Design:** template / colors / fonts / logo-cover image writes. Not public render of stored design.
- **QR:** table create/update/delete + owner table list/get. Not public `table.getByNumber` / QR resolve / ordering.

## 5. What happens when each is disabled?

Gated management operations deny. Public render / public QR resolution continue (subject to FROZEN). Data is not deleted. Reversible by enabling the key or moving to a plan that includes it.

## 6. What happens to existing data?

**Preserved:** menus, items, offers, designs, QR/table identities, sessions, historical records.

## 7. What happens to public rendering?

**Continues** with last saved catalog and last saved design. Not gated by these four keys.

## 8. What happens to public QR resolution?

**Continues.** Existing links keep resolving. FROZEN may still suspend menu/order. `smartQr` OFF does not delete identities and does not apply FROZEN.

## 9. What happens after plan change?

Capability map follows the **current** entitled Live Plan immediately (after entitlement cache invalidation). No Charged Terms write. Data stays. B → A restores management.

## 10. How does subscription expiry interact with them?

Existing Commercial Subscription Expiry / FROZEN **wins**. Capability gating does not redefine canceled/expired. ACTIVE + OFF is `requireFeature` deny. Concession remains commercially ACTIVE; capability still applies.

## 11. How does PLATFORM_OWNER / FULL_PLATFORM interact with them?

Existing hub grant. Once the four keys join `FEATURE_KEYS`, `allCurrentFeatures()` includes them. No new bypass. Customers cannot author FULL_PLATFORM.

## 12. What APIs require enforcement?

All GATED rows in `API-ENFORCEMENT-CONTRACT.md`: session owner mutations/reads; category/menuItem/offer mutations and editor lists; restaurant design writes; table management writes/reads.

## 13. Can any direct API bypass remain?

**No.** Direct tRPC of a GATED procedure with capability OFF must deny. Implementation must extend the matrix if a twin write path is found. UI hide is not sufficient.

## 14. Is schema change required?

**NO.**

## 15. Is migration required?

**DDL: NO.**  
**Data cutover: YES** — seed the four keys `included=true` on existing Live Plan bundles (Always-On preservation). Authorized only in the implementation program.

## 16. What audit events are required?

Reuse `commercial_catalog_updated` on plan/bundle save with before/after feature sets. No new audit system. No per-deny event required.

## 17. What tests are mandatory?

`TEST-CONTRACT.md`: ON/OFF, direct API, alternate path, UI, data preserved, A→B / B→A, FROZEN wins, PLATFORM_OWNER allowed, no plan-name conditionals.

## 18. Which architectural model is selected?

**MODEL A** — join existing Commercial Projection.

Catalog-promoted packaging origin for the four IDs (CAP-05/06/07 remain documentation; do not expand the 17 Discovery ELIGIBLE IDs). Not MODEL B/C.

## 19. What is the exact next implementation program?

**COMMERCIAL-PLAN-CAPABILITY-GATING-IMPLEMENTATION-1**

Must include:

1. Add the four IDs to `COMMERCIAL_PROJECTION_IDS` + catalog-promoted packaging rules; update length-15 guards to 19.
2. Unlock presentation cards; stop unconditional display inject.
3. Wire `requireFeature(ownerUserId, canonicalKey)` on every GATED procedure; replace Menu Design `isSubscriptionActive` + admin-role grant.
4. Cutover-seed existing Production bundles ON (not invented OFF assignments).
5. Negative tests per `TEST-CONTRACT.md`.
6. CE checklist declaration for each key.

FORENSICS → CONTRACT → ACCEPTANCE → IMPLEMENTATION.

**STOP AFTER CONTRACT.**
