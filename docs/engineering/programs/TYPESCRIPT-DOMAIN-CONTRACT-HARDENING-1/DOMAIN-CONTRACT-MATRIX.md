# DOMAIN CONTRACT MATRIX

**Program:** TYPESCRIPT-DOMAIN-CONTRACT-HARDENING-1

Canonical ownership used for every FIX_NOW:

| Concept | Owner | Not owner |
|---------|-------|-----------|
| Order lifecycle | Order Core Domain | Check, Reporting |
| Check financial aggregate | Check | Order, Reporting |
| Settlement / tenders | Financial Settlement Platform / Check | UI labels, Reporting |
| Payment method catalog | `shared/operational-session/check/paymentMethod.ts` | MarkPaid local state |
| Split Payment types | ADR-ARCH-024 / splitPaymentContract | Persistence mapper inventing names |
| Settlement Context | CRMP / ADR-ARCH-030 | Check money TX |
| Device issuance token | `IssuedOperationalDeviceToken` (includes pairingCode) | Recovery QR |
| Business-day hours type | `shared/utils/restaurantHours.ts` | Order aggregate |

## MarkPaid / tender

| Layer | Contract | Truth |
|-------|----------|-------|
| Canonical catalog | `cash \| card \| other` | `CANONICAL_MONETARY_PAYMENT_METHODS` |
| Staff selectable write | `cash \| card` | `SELECTABLE_PAYMENT_METHODS` — `other` hidden until needed |
| Staff settle DTO | `AcceptedSettlementPaymentMethod` | canonical + legacy mapped to card |
| Split Payment TenderMethod | broader instrument union including `other` | Check-owned FSP, not MarkPaid UI |
| Dialog bug | `useState<MonetaryPaymentMethod>` | UI too wide |

**Decision:** A — UI is wrong. Do **not** add `other` to selectable staff settle. Domain already owns `other` as catalog/default omit key (`DEFAULT_PAID_PAYMENT_METHOD`).

## Screen credential recovery

| Layer | Contract |
|-------|----------|
| Issuance | `IssuedOperationalDeviceToken` requires `pairingCode` (one-time bootstrap voucher) |
| Stored recovery | tokenId, secret, deviceId, issuedAt, expiresAt — no pairingCode |
| Presentation | QR payload via `Pick<..., tokenId \| secret \| issuedAt>` |

**Decision:** Recovery is not a new issuance. `presentRecovery` accepts the stored-token Pick. Do not invent pairingCode. Do not cast.

## Barrel exports

`PaymentAllocation`, `Tender`, `TenderAllocation`, `PaymentAttemptStatus`, `SplitPaymentAttemptProjectionIdentity`, `SplitPaymentOutstandingProjectionIdentity` already exist on the Split Payment contract. `@shared/operational-session` did not re-export them. Persistence/read consumers were correct; the barrel was incomplete.

## Sessionless Check backfill

`operationalChecks.sessionId` is nullable (M4/M5). `getOrdersBySessionId` requires a session. Sessionless Checks have no session-linked orders — skip, do not pass null.
