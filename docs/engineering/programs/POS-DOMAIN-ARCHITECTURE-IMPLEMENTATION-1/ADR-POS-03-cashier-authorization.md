# ADR-POS-03: POS Cashier Authorization

| Field | Value |
|---|---|
| **Status** | Accepted (program-local) |
| **Program** | POS-DOMAIN-ARCHITECTURE-IMPLEMENTATION-1 |
| **Date** | 2026-08-16 |

## Context

No cashier permission catalog existed. Restaurant owner/admin access is tenancy, not cashier authority. Public `order.settlePaid` proves order tracking ownership only.

## Decision

Add a POS permission namespace and a server-authoritative access decision: restaurant + terminal + user + explicit grant. Owner is not auto-granted. Financial operations are not implemented.

## Alternatives rejected

| Alternative | Rejected because |
|-------------|------------------|
| Owner = cashier | Explicitly forbidden |
| `settlePaid` = POS auth | Public token, not cashier |
| New global RBAC platform | Out of Phase 1 scope |
