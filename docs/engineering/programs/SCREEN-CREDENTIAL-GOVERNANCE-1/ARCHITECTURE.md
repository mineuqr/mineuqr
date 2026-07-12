# SCREEN-CREDENTIAL-GOVERNANCE-1 — Architecture

Final governance phase of SCREEN-CREDENTIAL-LIFECYCLE-1. No new lifecycle, no Runtime redesign.

## Material Separation

```
Operational Screen
        │
        ├──────────────► Authentication Material (secretHash)
        │                      │
        │                      ▼
        │               OperationalDeviceAuthService
        │               Runtime authentication ONLY
        │
        └──────────────► Recovery Material (secretCiphertext)
                               │
                               ▼
                        ScreenCredentialRecoveryService
                        Server-rendered QR / operator recovery ONLY
```

## Authentication Material

| Property | Value |
|----------|-------|
| Storage | `operational_device_tokens.secret_hash` |
| Owner | `OperationalDeviceAuthService` |
| Validation | `verifyDeviceSecret(input, token.secretHash)` |
| Recoverable | Never |
| Operator visible | Never |
| Used by runtime | Yes — sole auth source |

**Rules:** Runtime authentication MUST ONLY validate `secretHash`. It MUST NOT read `secretCiphertext`, QR payloads, or recovery packages.

## Recovery Material

| Property | Value |
|----------|-------|
| Storage | `operational_device_tokens.secret_ciphertext` |
| Owner | `ScreenCredentialRecoveryService` |
| Decryption | `decryptRecoveryMaterial()` — recovery module only |
| Authenticates | Never |
| Validates sessions | Never |
| Operator purpose | Show QR, Download QR, Copy Link |

**Rules:** Recovery material exists for operator convenience. Application code must not interpret it as an authentication credential.

## API Governance

| Endpoint | Returns secrets? | Uses recovery decrypt? | Auth impact |
|----------|------------------|------------------------|-------------|
| `runtime.authenticate` | No | No | Validates secretHash |
| `management.create` | No — `recoveryQrSvg` only | Yes (issuance) | Issues auth hash |
| `management.regenerateCredential` | No — `recoveryQrSvg` only | Yes (issuance) | Rotates auth hash |
| `management.getScreenCredential` | No — `recoveryQrSvg` only | Yes | None |
| `management.deleteScreen` | No | No | Revokes auth hash |

## Frontend Security

Operator dashboard receives server-rendered SVG QR images. Plaintext credentials are not returned in tRPC JSON responses. Device pairing still occurs via QR scan on the operational device (out of scope for operator JS).

## Enforcement

Regression tests in:

- `server/operational-device/__tests__/screenCredentialGovernance.test.ts`
- `client/src/lib/screen-credential-lifecycle/__tests__/credentialGovernance.guards.test.ts`

Violations (auth service importing decrypt, registry decrypting recovery material) fail CI.
