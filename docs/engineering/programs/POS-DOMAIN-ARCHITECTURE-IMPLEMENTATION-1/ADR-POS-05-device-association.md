# ADR-POS-05: POS Device Association

| Field | Value |
|---|---|
| **Status** | Accepted (program-local) |
| **Program** | POS-DOMAIN-ARCHITECTURE-IMPLEMENTATION-1 |
| **Date** | 2026-08-16 |

## Context

Operational Device is screen/hardware fleet. POS Terminal is a logical point of sale. They must not merge.

## Decision

POS Terminal may later reference a device via nullable `optionalDeviceId`. Device is never required to provision a terminal and is never canonical identity.

## Alternatives rejected

| Alternative | Rejected because |
|-------------|------------------|
| Device id as terminal id | Hardware is not logical POS identity |
| Mandatory device to provision | Cloud-authoritative logical terminal first |
