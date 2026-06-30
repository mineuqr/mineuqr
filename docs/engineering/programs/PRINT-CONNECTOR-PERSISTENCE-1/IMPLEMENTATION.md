# PRINT-CONNECTOR-PERSISTENCE-1 — Implementation

**Date:** 2026-06-30  
**Authority:** ADR-ARCH-016 · ADR-ARCH-017  
**Status:** Complete

---

## Implementation Summary

PRINT-CONNECTOR-PERSISTENCE-1 successfully achieved its architectural objective:

- **Durable Connector Identity** — connector instance ID bound to restaurant enrollment in `connector_enrollments`
- **Durable Enrollment** — pairing tokens and enrollment records persist across cloud restarts
- **Durable Credentials** — hashed secrets stored in MySQL; secrets are not regenerated for active enrollments
- **Automatic reconnect without re-enrollment** — connector authenticates with stored credential; cloud validates against durable enrollment

These capabilities are now **production architecture compliant** for connector identity and enrollment persistence.

In-memory pairing and credential repositories were replaced with Drizzle-backed persistence in production composition. Gateway protocol, printing flow, discovery, and provision were not modified.

---

## Product Implementation Result

### Persistence model

| Concern | Storage | Survives cloud restart |
|---------|---------|--------------------------|
| Connector Identity | `connector_enrollments.connectorInstanceId` | Yes |
| Connector Enrollment | `connector_enrollments` | Yes |
| Connector Credentials | `connector_enrollments.secretHash` | Yes |
| Pairing tokens | `connector_pairing_tokens` | Yes |
| Enrollment metadata | `issuedAt`, `lastSeenAt`, `status`, `connectorVersion` | Yes |

### Behavior delivered

- Production `connectorNetworkComposition` uses `DrizzleConnectorCredentialRepository` and `DrizzleConnectorPairingRepository`.
- Re-pairing is blocked for active connector instance IDs (credentials not regenerated unnecessarily).
- `lastSeenAt` and `connectorVersion` updated on successful authentication.
- Connector restart / Windows reboot: RLC file-based config retains secret; cloud recognizes prior enrollment.
- Vitest uses in-memory repositories (`VITEST` / `CONNECTOR_PERSISTENCE_IN_MEMORY=1`); no DB required in CI.

### Files changed

| Path | Change |
|------|--------|
| `drizzle/0051_connector_enrollment.sql` | New tables `connector_pairing_tokens`, `connector_enrollments` |
| `drizzle/meta/_journal.json` | Migration journal entry |
| `drizzle/schema.ts` | Drizzle schema for pairing tokens and enrollments |
| `server/connector-session/contracts/sessionContracts.ts` | `ConnectorEnrollmentStatus`, extended `ConnectorCredentialRecord` |
| `server/connector-session/contracts/ConnectorCredentialRepository.ts` | `findByConnectorInstanceId`, `touchEnrollment` |
| `server/connector-session/infrastructure/DrizzleConnectorPairingRepository.ts` | Durable pairing token persistence |
| `server/connector-session/infrastructure/DrizzleConnectorCredentialRepository.ts` | Durable enrollment persistence |
| `server/connector-session/infrastructure/InMemoryConnectorCredentialRepository.ts` | New repository methods (test/dev) |
| `server/connector-session/services/ConnectorAuthenticationService.ts` | Block re-pairing; touch `lastSeenAt`/`connectorVersion` on auth |
| `server/connector-session/networkComposition.ts` | Production Drizzle repos; in-memory under test flag |
| `server/connector-session/__tests__/connectorEnrollmentPersistence.test.ts` | Persistence / restart simulation tests |
| `server/connector-session/__tests__/persistence.architecture.guards.test.ts` | Architecture guards |
| `server/connector-session/__tests__/ConnectorAuthenticationService.test.ts` | Duplicate pairing guard test |
| `server/connector-session/__tests__/DuplicateSession.test.ts` | Reconnect uses stored credential |
| `server/connector-session/__tests__/sessionTestHarness.ts` | Optional `credentialSecret` for reconnect flows |

### Tests executed

| Command | Result |
|---------|--------|
| `npm run check` | Pass |
| `npx vitest run server/connector-session server/connector-product server/connector-gateway server/connector-local` | 93 passed, 1 skipped (29 files) |

---

## Deployment Notes

Before production deployment, apply migration `0051` using the standard migration process (`npm run db:migrate`).

This is a **deployment prerequisite**, not a software limitation. The migration artifact and schema are implemented; applying it is an operator action at deploy time.

---

## Migration Notes

Connectors enrolled before deployment of durable enrollment persistence require **one-time re-enrollment** after production deployment. Pre-deploy cloud state was volatile (in-memory); there is no source data to import.

All future enrollments are durable.

This is a **one-time migration consequence**, not an architectural limitation.

---

## Runtime Characteristics

Connector presence is **runtime state**, distinct from durable identity and enrollment:

| Layer | Nature | Persistence |
|-------|--------|-------------|
| Connector Identity | Enrollment-bound instance ID | Durable (`connector_enrollments`) |
| Connector Enrollment | Restaurant pairing + credential record | Durable (`connector_enrollments`, `connector_pairing_tokens`) |
| Connector Presence | Live WebSocket session, gateway registry, transport binding | Runtime (in-memory) |

After cloud restart, enrolled connectors **reconnect automatically** using stored credentials. The live connector list and session bindings are rebuilt at connect time. This is expected runtime behavior and is **not** a missing persistence capability for identity or enrollment.

---

## Operational Validation

The following require evidence on a real deployment. They are **outside the scope** of PRINT-CONNECTOR-PERSISTENCE-1 software delivery but remain open for production certification:

| Item | Description |
|------|-------------|
| Cloud restart + reconnect | Verify enrolled connector reconnects without re-enrollment on staging/production after cloud restart |
| Recovery validation | Verify connector survives service restart, Windows reboot, and application restart with automatic reconnect |

Automated tests cover persistence contracts and restart simulation; real-environment validation is pending.

---

## Remaining Certification Blockers

Only items **intentionally outside** PRINT-CONNECTOR-PERSISTENCE-1 scope:

| ID | Blocker | Category |
|----|---------|----------|
| RECERT-B1 | No published/signed connector installer artifact (`CONNECTOR_DOWNLOAD_URL` unset) | Product release |
| RECERT-B2 | No staging E2E operator-journey evidence (15/15 steps unverified) | Production E2E |
| RECERT-B3 | Windows live production validation not executed in CI (`RLC_VALIDATE_WINDOWS=1` required) | Real Windows validation |
| RECERT-B4 | Cloud restart + connector reconnect not validated in real environment | Operational validation |
| RECERT-B8 | Full production recertification journey **NOT CERTIFIED** | Future certification work |

### Reclassified (no longer certification blockers for this program)

| Former ID | Reclassification |
|-----------|------------------|
| RECERT-B5 | **Deployment Notes** — migration apply is a deploy prerequisite, not a software gap |
| RECERT-B6 | **Migration Notes** — one-time re-enrollment for pre-deploy enrollments |
| RECERT-B7 | **Runtime Characteristics** — gateway registry/session presence is runtime state, not missing enrollment persistence |

Resolved by PRINT-CONNECTOR-PERSISTENCE-1 (not listed as blockers):

- Volatile in-memory pairing persistence
- Volatile in-memory connector credential storage
- Cloud restart losing connector enrollment identity
- Re-enrollment required after connector/cloud restart (for post-deploy enrollments)
