# ADR-POS-02: POS Entitlement Quantity

| Field | Value |
|---|---|
| **Status** | Accepted (program-local) |
| **Program** | POS-DOMAIN-ARCHITECTURE-IMPLEMENTATION-1 |
| **Date** | 2026-08-16 |

## Context

POS quantity must use the existing Live Plan limit path. `devices` is already an orphaned/device capability and must not mean POS terminal count.

## Decision

Introduce optional limit key `posTerminals`. Authority is `commercial_limit_values` + `checkLimit`. Missing key fail-closes to 0 for non-admin. Do not add the key to required `LIVE_PLAN_LIMIT_KEYS` (those remain restaurants/categories/items).

## Alternatives rejected

| Alternative | Rejected because |
|-------------|------------------|
| Second entitlement system | Forbidden |
| `devices` as POS quantity | Different domain |
| Hard-coded 1 / unlimited | Fail-closed required |
| Capability flag meaning "number of terminals" | Quantity is a limit |
