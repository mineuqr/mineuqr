# PRINT-RELEASE-AUTOMATION-1

## Architecture Summary

PRINT-RELEASE-AUTOMATION-1 automates the certified PRINT-RELEASE-DISTRIBUTION-1 layer through GitHub Actions. Official connector releases are produced only in CI on `windows-latest`; developer workstations build for validation but do not publish production releases by default.

The automation reuses:

- **Release Authority:** `connector-product/release/connector-release.json`
- **Release Registry:** `connector_published_releases` with promotion state machine
- **Release Storage:** Cloudflare R2 via `ReleaseStoragePort`
- **Release Distribution Service:** unchanged dashboard contract

New automation components:

- **Release Factory Workflow:** `.github/workflows/connector-release.yml`
- **Promotion State Machine:** `ReleasePromotionService` + registry transitions
- **Verification Gate:** `ReleaseVerificationService`
- **Automation CLI:** `scripts/connector-release-automation.ts`
- **Installer Smoke Test:** `connector-product/windows/smoke-test-installer.ps1`
- **SLSA Provenance:** `actions/attest-build-provenance@v2`

## Release State Machine

```
candidate
  → published      (R2 upload + registry publication)
  → verified       (checksum + manifest + registry verification)
  → smoke_test_passed (installer install/health/uninstall smoke test)
  → promoted       (promotion gate)
  → active         (dashboard download enabled)
```

Previous active releases transition to `superseded` on activation.

Activation is blocked unless status is `promoted`.

## GitHub Actions Workflows Added

| Workflow | Purpose |
|----------|---------|
| `.github/workflows/connector-release.yml` | Official release factory (tag + manual dispatch) |
| `.github/workflows/connector-release-admin.yml` | Administrative supersede (no delete permissions) |

Required secrets: `DATABASE_URL`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_BASE_URL`, `R2_ACCOUNT_ID` or `R2_ENDPOINT`.

Tag format: `connector-v<version>` must match `connector-release.json`.

## Manifest Improvements

Distribution manifest schema v2 adds:

- `distribution.installerStorageKey`
- `distribution.installerArtifactId`
- `distribution.manifestStorageKey`
- `policy.rollbackTo`
- `policy.minSupportedVersion`
- `policy.forceUpdate`

No hardcoded download URLs. URLs are resolved at read time by `ReleaseDistributionService`.

Optional canonical policy source: `connector-release.json.releasePolicy`.

## Audit Trail

Registry records:

- `gitTag`, `commitSha`, `workflowRunId`, `publisher`
- `publishedAt`, `verifiedAt`, `smokeTestPassedAt`, `promotedAt`, `activatedAt`

## Security

- Release workflow: read + upload + registry update only (no R2 delete)
- Admin workflow: registry supersede only
- Immutable artifacts: storage rejects overwrite of existing release objects
- SLSA build provenance attestation on installer + manifest + checksums

## Future Extension Points

Architecture supports future addition without redesign:

- SBOM generation step before attest
- Sigstore signing after build
- Malware scanning gate before `verified`
- EV code signing between build and publish
- Separate staging vs production promotion workflows
