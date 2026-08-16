# ADR-POS-01: POS Terminal Domain Ownership

| Field | Value |
|---|---|
| **Status** | Accepted (program-local) |
| **Program** | POS-DOMAIN-ARCHITECTURE-IMPLEMENTATION-1 |
| **Date** | 2026-08-16 |

## Context

MineuQR has Operational Devices (screens) and CRMP Registers. Investigation certified that neither is a POS Terminal.

## Decision

Create a new POS-owned `pos_terminals` domain. POS Terminal is a logical authorized point of sale with restaurant ownership and an explicit lifecycle.

## Alternatives rejected

| Alternative | Rejected because |
|-------------|------------------|
| Reuse `operational_devices` | Device is screen/hardware fleet |
| Reuse CRMP Register / `mobile_pos` | Register is custody station; naming collision only |
| Use cashier user as terminal | User ≠ terminal |
