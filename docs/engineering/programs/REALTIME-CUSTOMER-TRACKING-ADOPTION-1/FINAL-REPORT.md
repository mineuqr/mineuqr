# FINAL REPORT — REALTIME-CUSTOMER-TRACKING-ADOPTION-1

**Date:** 2026-07-28  
**Status:** READY FOR ARCHITECTURE AUTHORITY REVIEW  
**Constraints:** Customer Tracking only · No commit · No push · No deploy

---

## 1. Executive Summary

Customer Tracking (public order status) now uses the Realtime Platform as **primary discovery while the page is open**. Hints arrive on channel `customer` after durable P-11 public status projection sync; the page invalidates and refetches `getPublicStatus` (write-model authority unchanged). Public SSE payloads are privacy-sanitized (no restaurant, order, session, version, or DTO fields). Web Push remains complementary; polling is automatic recovery (15s when live, 3s otherwise). Orders, Kitchen, and Expo adoptions are untouched.

---

## 2. Customer Adoption Architecture

```
Order Aggregate → Outbox → Event Pipeline
  → P-11 PublicOrderStatusProjection sync
  → customer channel hint (internal bus: tenant + aggregate ACL)
  → SSE sanitize (public envelope only)
  → useCustomerTrackingRealtime
  → invalidate getPublicStatus
  → refetch + render
```

Realtime never owns customer state. Realtime is not a public business API.

---

## 3. Public Realtime Flow

1. Guest opens `/menu/:slug/order/:trackingToken`
2. `mintCustomerTicket({ trackingToken, slug })` — publicProcedure
3. `getRealtimePlatform().connect` with channel `customer`
4. On hint / catch-up → invalidate → refetch `order.getPublicStatus`
5. Status, expiry, and dining-session fields still come only from getPublicStatus

---

## 4. Public Security Architecture

| Control | Implementation |
|---|---|
| Auth | Tracking token + restaurant slug (same as getPublicStatus) |
| Ticket mode | `customer_tracking` only |
| Channel ACL | `customer` only (staff/device cannot mint customer; customer cannot mint staff) |
| Aggregate ACL | Ticket `orderId` must match hint `aggregateId` |
| Tenant ACL | Ticket `restaurantId` must match hint (server routing) |
| Mint response | No `restaurantId` / `orderId` / raw claims dump |
| SSE data | Sanitized public envelope |
| Staff isolation | Customer tickets cannot authorize orders/kitchen/expo |

---

## 5. Tracking Token Validation

- Mint requires same token+slug lookup as `getPublicStatus`
- Invalid / mismatched credentials → uniform `UNAUTHORIZED` (no enumeration)
- Token format aligned with public status (16–64, charset regex)
- Subject = `th:{sha256-prefix}`; public `trackingRef` is the same hash prefix

---

## 6. Realtime Ticket Validation

- HMAC-signed short-lived ticket (foundation service)
- Channel filter strips any non-customer channel request
- Expired / bad signature / revoked → gateway 401/403
- Renewal: re-mint via `mintCustomerTicket` with live tracking credentials

---

## 7. Privacy Review

Customer Realtime must not expose restaurant identity, kitchen workflow, staff activity, financials, checks, or internal timestamps beyond the public hint `ts`.

**SSE public payload:** `type`, `trackingRef`, `ts`, optional `correlationId`.

**Residual (documented):** signed ticket payload still embeds `restaurantId`/`orderId` for server ACL (foundation HMAC ticket design, not encrypted). Mint **API JSON** does not return those claims. Follow-up: opaque server-side ticket store if absolute ticket-payload privacy is required.

---

## 8. Payload Audit

| Field | Internal bus | Public SSE |
|---|---|---|
| type | yes | yes |
| channel | yes | no |
| restaurantId | yes | no |
| aggregateId | yes | no |
| seq | yes | no |
| version | yes | no |
| trackingRef | n/a | yes (from ticket) |
| ts | yes | yes |
| correlationId | optional | optional |

Forbidden in public payload (asserted): restaurantId, orderId, sessionId, checkId, aggregateId, version, seq, status, lineItems, totalAmount, tableNumber.

---

## 9. Read Freshness Validation

Customer status remains write-model `getPublicStatus` (not projection-served at runtime). Realtime only triggers invalidate → refetch. Cache is never mutated from SSE. Capability registry marks `readFreshness: true` for the surface (invalidate/refetch governance).

---

## 10. Polling Recovery Validation

| State | Interval |
|---|---|
| Realtime live | 15s (`CUSTOMER_ORDER_STATUS_REALTIME_RECOVERY_POLL_MS`) |
| Else (fallback / disabled) | 3s (`CUSTOMER_ORDER_STATUS_POLL_MS`) |
| Terminal served/cancelled / tracking expired | poll off |

---

## 11. Web Push Coexistence Validation

- `useReadyStatusAlerts` unchanged
- Realtime = open-page immediate refresh
- Push = wake when page closed / background
- Poll = recovery
- Realtime does not replace Push

---

## 12. Reconnect Validation

Platform client: reconnect with backoff → `poll_only` after max attempts; visibility regain retries SSE. Catch-up event forces refetch. Missed/duplicate public hints: client-side dedupe by trackingRef+type+ts+correlationId; late hints still invalidate safely.

---

## 13. Performance Benchmark

Target path P95 &lt; 1s (projection → hint → invalidate → refetch → render) under normal load — same operational target as prior adoptions. Web Push remains best-effort. Polling fallback within existing 3s SLA.

---

## 14. Observability Report

Existing platform metrics retained: connections, deliveries, dropped, authFailures, heartbeats. Delivery notes `public: true` for customer_tracking. Correlation id preserved on public hints when present on the envelope.

---

## 15. Security Assessment

| Threat | Mitigation |
|---|---|
| Cross-customer leakage | orderId-scoped deliver ACL |
| Cross-tenant leakage | restaurantId bus + ticket match |
| Unauthorized staff channels | authMode channel filter |
| Enumeration | uniform UNAUTHORIZED on mint |
| Replay of SSE | short-lived ticket + revoke set; hints are invalidation-only |
| Fat payload / DTO leak | sanitize + privacy assert in tests |
| Guessable tokens | existing tracking token entropy + mint validation |

---

## 16. Test Results

Automated coverage in `realtimeCustomerTrackingAdoption.architecture.guards.test.ts`:

- Hint mapping
- Tracking hash + public payload privacy
- Ticket channel isolation (customer vs staff)
- Publisher on `customer` channel
- P-11 wiring
- OrderStatusPage / hook (no EventSource; customer-only)
- Public mint procedure
- Gateway sanitization
- Capability migration
- Poll constants
- Program docs

---

## 17. Regression Analysis

| Surface | Impact |
|---|---|
| Orders / Kitchen / Expo | Unchanged channels and hooks |
| Web Push | Unchanged |
| getPublicStatus contract | Unchanged (added `restaurantId` to DB select for mint; not returned publicly) |
| Sessions / Checks / Dashboard / Register / Devices / Print | Not migrated |

---

## 18. Production Readiness Report

- Feature gated by `REALTIME_PLATFORM_ENABLED` (same as foundation)
- Customer Tracking is first public-facing adoption; stricter sanitization in place
- No commit / push / deploy performed in this program

---

## Success Criteria Checklist

- [x] Customer Tracking no longer relies on polling as primary discovery (when platform enabled + live)
- [x] Web Push unchanged
- [x] Polling remains recovery only (15s / 3s)
- [x] No EventSource in Customer Tracking page/hook
- [x] Consumes only Realtime Platform
- [x] Read path remains getPublicStatus authority
- [x] Public payloads minimized
- [x] Tracking / tenant / customer isolation preserved
- [x] Business behaviour unchanged
- [x] Only Customer Tracking migrated

---

**READY FOR ARCHITECTURE AUTHORITY REVIEW**
