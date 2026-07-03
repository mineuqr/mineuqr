# WINDOWS-CODE-SIGNING-1 — Architecture Decision Record

## Root cause

Windows SmartScreen warns because the connector installer is not Authenticode signed. Unsigned executables have no publisher identity or reputation.

## Decision

| Topic | Selection |
|---|---|
| Certificate (current stage) | **Standard OV Code Signing** (PFX via GitHub Secrets) |
| Certificate (upgrade path) | **EV Code Signing** via hardware token or cloud HSM (Azure Trusted Signing / DigiCert KeyLocker) |
| Timestamp | **DigiCert** `http://timestamp.digicert.com` with `/tr` + `/td SHA256` |
| Secret storage | **GitHub Actions encrypted secrets** (`CONNECTOR_SIGNING_PFX_BASE64`, `CONNECTOR_SIGNING_CERT_PASSWORD`) |
| Signing tool | **signtool.exe** (Windows SDK) |
| Verification | **signtool verify /pa /v /tw** + `Get-AuthenticodeSignature` Valid + timestamp check |

## Rejected alternatives

| Alternative | Reason |
|---|---|
| Unsigned + SmartScreen bypass | Violates security policy; not production-grade |
| EV token directly in GitHub runner | EV private keys cannot leave HSM; incompatible with default GHA runners |
| PFX committed to repository | Critical secret exposure |
| Sign after publish | Checksums and attestation must reflect signed bytes |
| Skip verification | No deterministic release gate |

## Release pipeline integration

```
build-release.ps1 (-SkipFinalize)
  → prepare-connector-signing.ps1
  → sign-release.ps1 (sign + verify + finalize)
  → verify-release-signature.ps1 (workflow gate)
  → attest / publish / verify / smoke / promote / activate
```

Build fails if credentials, signing, or verification fail.

## Operator setup

1. Obtain Standard or EV code signing certificate from a trusted CA.
2. Export PFX (EV: per CA/HSM policy).
3. Base64-encode PFX: `[Convert]::ToBase64String([IO.File]::ReadAllBytes('cert.pfx'))`
4. Add GitHub repository secrets:
   - `CONNECTOR_SIGNING_PFX_BASE64`
   - `CONNECTOR_SIGNING_CERT_PASSWORD`
