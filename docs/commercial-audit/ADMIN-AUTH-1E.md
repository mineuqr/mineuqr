# ADMIN-AUTH-1E — Platform Subscription Protection

**Date:** 2026-06-07  
**Prerequisite:** ADMIN-AUTH-1D (platform account protection via `ENV.ownerOpenId`)

---

## Problem

ADMIN-AUTH-1D protected delete, role, and classification mutations. A cross-audit gap remained:

- Subscription-management actions were visible in `AdminManagement.tsx`.
- Admin subscription mutations had no platform-account guard.
- `generateInvoicePDF` could create billing records for the platform owner.

Platform identity remains `ENV.ownerOpenId` — no hardcoded user IDs, no role- or classification-based protection.

---

## Protected mutation inventory

| Procedure | Effect | Guard |
|-----------|--------|-------|
| `admin.createUserSubscriptionByAdmin` | Creates account-level subscription, plan/trial/billing assignment | `assertProtectedUserSubscriptionModifiable` |
| `admin.updateUserSubscriptionByAdmin` | Updates plan, billing cycle, status, period end | `assertProtectedUserSubscriptionModifiable` |
| `admin.deleteUserSubscriptionByAdmin` | Deletes subscription cascade (invoices, notifications, row) | `assertProtectedUserSubscriptionModifiable` |
| `admin.generateInvoicePDF` | Creates invoice record + PDF artifact | `assertProtectedUserSubscriptionModifiable` |

### Retired / read-only (no additional guard required)

| Procedure | Status |
|-----------|--------|
| `admin.createRestaurantSubscription` | Retired (`PRECONDITION_FAILED`) |
| `admin.updateRestaurantSubscription` | Retired |
| `admin.cancelRestaurantSubscription` | Retired |
| `admin.deleteRestaurantSubscription` | Retired |
| `admin.getUserInvoices` | Read-only — allowed |

---

## Server enforcement

New helper in `server/db/cascadeDeletes.ts`:

```text
assertProtectedUserSubscriptionModifiable(userId)
  → isPlatformAccountUserId(userId)
  → ProtectedUserModifyError(action: "subscription")
```

tRPC handlers map to `BAD_REQUEST` with Arabic messages, matching ADMIN-AUTH-1D patterns.

---

## UI enforcement

`client/src/pages/AdminManagement.tsx` — `renderUserActions()`:

When `isProtectedPlatformAccountUser(u) === true`, the entire `secondary` action group is hidden:

- Edit Account Subscription
- Delete Subscription
- Create Account Subscription
- Generate invoice PDF

Delete user and Edit role remain guarded as in ADMIN-AUTH-1D.

---

## E.3 — Invoice protection findings

| Operation | Mutates state? | Decision |
|-----------|----------------|----------|
| `admin.generateInvoicePDF` | **Yes** — inserts `invoices` row, uploads PDF, may mark paid | **Protected** (ADMIN-AUTH-1E) |
| `admin.getUserInvoices` | No — list only | Allowed (read-only) |
| CRS `invoiceEligible` on platform owner | N/A — platform is `INTERNAL`, excluded from commercial population (ADMIN-AUTH-1C) | Documented; no code change to MRR/ARR |

**Rationale:** Platform account is not a commercial customer. Invoice PDF generation is an admin billing mutation, not historical reporting. Hiding the UI button and blocking the mutation prevents accidental commercial entanglement.

---

## Architecture (unchanged)

```text
Authorization          → role
Commercial Population  → accountClassification
Platform Protection    → ENV.ownerOpenId
```

ADMIN-AUTH-1E extends platform protection into the subscription-management domain only.

---

## Production impact

| Area | Impact |
|------|--------|
| Platform owner row in `/admin/operations` | Subscription + invoice actions hidden |
| Direct API / script calls | `BAD_REQUEST` on protected mutations |
| Commercial analytics / MRR / ARR | None |
| Non-platform users | Unchanged |
| `OWNER_OPEN_ID` | Must remain set (same as 1D) |

---

## Verification steps

1. Confirm `isProtectedPlatformAccount: true` on platform row via `admin.getOwnerOverviewList`.
2. Open `/admin/operations` — platform row must not show subscription or invoice actions.
3. Attempt `admin.createUserSubscriptionByAdmin` for platform `userId` → `BAD_REQUEST`.
4. Attempt `admin.updateUserSubscriptionByAdmin` → `BAD_REQUEST`.
5. Attempt `admin.deleteUserSubscriptionByAdmin` → `BAD_REQUEST`.
6. Attempt `admin.generateInvoicePDF` → `BAD_REQUEST`.
7. Confirm non-platform user subscription flows still work.

---

## Related docs

- [ADMIN-AUTH-1D.md](./ADMIN-AUTH-1D.md)
- [ADMIN-AUTH-1E-TEST-COVERAGE.md](./ADMIN-AUTH-1E-TEST-COVERAGE.md)
- [ADMIN-AUTH-1E-COMPLETION-REPORT.md](./ADMIN-AUTH-1E-COMPLETION-REPORT.md)
