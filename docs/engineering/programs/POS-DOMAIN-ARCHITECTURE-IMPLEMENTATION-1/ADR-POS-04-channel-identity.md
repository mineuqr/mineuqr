# ADR-POS-04: POS Channel Identity

| Field | Value |
|---|---|
| **Status** | Accepted (program-local) |
| **Program** | POS-DOMAIN-ARCHITECTURE-IMPLEMENTATION-1 |
| **Date** | 2026-08-16 |

## Context

Ordering Channel Registry is the only channel SSOT. `cashier_pos` was missing. Settlement must not rewrite Order channel.

## Decision

Register `cashier_pos` as `registered`, `reportingVisible: false`. Table/QR paid by a cashier remain Table/QR. Future direct POS sales will stamp `cashier_pos` at PlaceOrder.

## Alternatives rejected

| Alternative | Rejected because |
|-------------|------------------|
| POS-specific channel registry | Second registry forbidden |
| Rewrite channel on settle | Destroys provenance |
