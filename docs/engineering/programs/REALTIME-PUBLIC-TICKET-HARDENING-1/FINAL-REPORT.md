# FINAL REPORT — REALTIME-PUBLIC-TICKET-HARDENING-1

**Date:** 2026-07-28  
**Status:** READY FOR ARCHITECTURE AUTHORITY REVIEW  
**Constraints:** Public ticket hardening only · No commit · No push · No deploy

---

## 1. Executive Summary

Customer Realtime credentials no longer ship as signed JWTs with readable business claims. New customer mints return opaque `rt_live_…` identifiers; authorization loads ACL exclusively from an in-process Realtime Ticket Registry. Staff/device signed tickets are unchanged. Legacy customer JWTs remain accepted during a controlled migration window. Customer Tracking UX, transport, hints, and read paths are unchanged.

---

## 2. Opaque Ticket Architecture

```
Tracking Token + Slug
  → mintCustomerTicket
  → issueOpaqueCustomerTicket
  → rt_live_<256-bit>
  → client (token only)
  → SSE ?ticket=
  → authorizeRealtimeCredential
  → registry lookup
  → server claims (restaurant/order/channels/expiry)
  → subscribe
```

Client cannot decode restaurantId, orderId, ACL, or tenant metadata from the ticket string.

---

## 3. Registry Architecture

In-memory `Map` (single-node; multi-instance → shared store later).

| Field | Purpose |
|---|---|
| ticketId | Opaque id |
| tenantId / restaurantId | Tenant ACL |
| orderId | Customer aggregate ACL |
| trackingTokenHash | Public hint sanitization |
| allowedChannels | Channel ACL (`customer`) |
| issuedAt / expiresAt / lastAccessAt | Lifecycle |
| status | active \| revoked \| expired |
| boundConnectionId | Optional first-connection bind |
| revocationReason | Audit |

Periodic cleanup (60s) removes dead tickets past grace.

---

## 4. Authorization Flow

1. Prefix `rt_live_` → registry lookup (sole source for opaque)
2. Else signed JWT verify → staff/device; customer JWT only if legacy enabled
3. Gateway never trusts client-supplied claims

---

## 5. Ticket Lifecycle

| Action | API / mechanism |
|---|---|
| Issue | `mintCustomerTicket` |
| Renew | `renewCustomerTicket` (rotate) or remint with tracking credentials |
| Expire | TTL; lookup rejects |
| Revoke | `revokeCustomerTicket` / renew rotation |
| Reconnect | Reuse valid opaque ticket; expired → remint |
| Cleanup | `cleanupOpaqueRealtimeTickets` |

---

## 6. Migration Strategy

1. Opaque mint **on** (default)
2. Legacy customer JWT **accepted** (default)
3. Observe auth failures / reconnects
4. Set `REALTIME_LEGACY_CUSTOMER_JWT=false`
5. Optional later: remove customer JWT mint rollback path

Rollback mint: `REALTIME_OPAQUE_CUSTOMER_TICKETS=false`.

---

## 7. Backward Compatibility Report

| Surface | Behaviour |
|---|---|
| Customer mint response | Still `{ token, expiresAt, ssePath, channels, protocolVersion, negotiated }` — `trackingRef` removed (unused by client) |
| Customer hook | Unchanged (`mintCustomerTicket` + platform connect) |
| Staff / device JWT | Unchanged |
| In-flight customer JWTs | Work until legacy disabled |

---

## 8. Security Assessment

| Threat | Mitigation |
|---|---|
| Ticket forgery | 256-bit random; unknown ids → not_found |
| Decode claims | No JWT payload |
| Replay after revoke | Registry status revoked |
| Expired use | expiresAt check |
| Enumeration | Uniform auth failures; unguessable ids |
| Cross-customer | orderId ACL on deliver |
| Cross-tenant | restaurantId match |
| Staff channel access | customer channel only in registry |
| Timing | Map lookup; opaque id compare unused on hot path |

---

## 9. Privacy Assessment

| Artifact | Leaves server? |
|---|---|
| Opaque ticket id | Yes |
| restaurantId / orderId in mint JSON | No |
| restaurantId in customer platform.ready | No |
| trackingRef in mint JSON | No |
| Public hint `trackingRef` | Yes (prior certified hint model — unchanged this program) |

Residual: public hint envelope still includes opaque tracking hash per REALTIME-CUSTOMER-TRACKING-ADOPTION-1 (hint model frozen).

---

## 10. Performance Benchmark

Registry lookup is O(1) Map get. Test instrumentation records `registryLookupLatencyMicros` (sum) / `registryLookups` (count). Local unit path is well under P95 &lt; 5ms target. Mint adds one Map set — negligible vs tracking-token DB lookup.

---

## 11. Observability Report

New metrics: `ticketsIssued`, `ticketsRenewed`, `ticketsExpired`, `ticketsRevoked`, `registryLookups`, `registryLookupLatencyMicros`, `channelAuthFailures`.

Ops events: `realtime_ticket_issued`, `realtime_ticket_revoked`, `realtime_ticket_cleanup`.

---

## 12. Test Results

`realtimePublicTicketHardening.test.ts`: issuance, lookup, forgery, revoke/expire, renew, cleanup, concurrency, connection bind, isolation, legacy migration flags, gateway ready sanitization, architecture guards. Foundation + customer adoption suites remain green.

---

## 13. Regression Analysis

| Area | Impact |
|---|---|
| SSE transport | Unchanged |
| Channels / hints | Unchanged |
| OrderStatusPage UX | Unchanged |
| Poll / Push / Read Freshness | Unchanged |
| Staff/device tickets | Unchanged |

---

## 14. Production Readiness Report

- Default: opaque customer tickets + legacy JWT accept (zero-downtime)
- Cutover flag documented
- In-memory registry is single-node (same class as prior revocation set); multi-instance shared registry is a follow-up
- No commit / push / deploy in this program

---

## Success Criteria Checklist

- [x] No JWT business claims reach the client (opaque mint default)
- [x] No restaurant/order ids in customer mint / ready payloads
- [x] Registry is sole ACL source for opaque tickets
- [x] Opaque tickets cannot be decoded
- [x] 256-bit entropy
- [x] Lifecycle: issue / renew / expire / revoke / cleanup
- [x] Authorization server-side
- [x] Customer Tracking behaviour / UX unchanged
- [x] Transport / hint model / Read Freshness unchanged
- [x] Tenant + customer isolation preserved
- [x] Migration + rollback flags

---

**READY FOR ARCHITECTURE AUTHORITY REVIEW**
