# PRINT-CONNECTOR-NETWORK-1 — Authentication

**ADR:** Domain B — RLC → Cloud

---

## Model

| Element | Purpose |
|---------|---------|
| **Pairing token** | One-time admin/QR code binds RLC to `restaurantId` |
| **Connector credential** | Long-lived scoped secret issued after pairing |
| **Instance identity** | `connectorId` + `deploymentType` + host fingerprint |
| **Revocation** | Admin can revoke; gateway rejects revoked credentials |

No anonymous connectors.

---

## Flow

1. Cloud issues pairing token (`ConnectorAuthenticationService.issuePairingToken`)
2. RLC completes pairing → credential issued (`completePairing`)
3. RLC presents `credentialSecret` on session `auth` message
4. Cloud validates tenant, instance, version, revocation (`validateCredential`)
5. Session transitions to `authenticating` → `registered`

---

## Tenant Isolation

- Credentials bound to single `restaurantId`
- Validation rejects tenant mismatch
- Credential instance binding enforced when `connectorInstanceId` is set

---

## Session Renewal

Heartbeat updates `auth.renewedAt` on the live session. Credential expiry checked on each authentication attempt.

---

## Implementation

`ConnectorAuthenticationService` + `InMemoryConnectorCredentialRepository` + `InMemoryConnectorPairingRepository` (infrastructure metadata only; no business state).

Secret storage uses SHA-256 hash with timing-safe comparison (`connectorCrypto.ts`).
